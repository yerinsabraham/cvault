import { prisma } from '../utils/prisma';
import { encryptPrivateKey, decryptPrivateKey, getNextAvailableIp } from '../utils/crypto';
import { wireguardService } from './wireguard.service';

export interface RegisterDeviceDto {
  deviceName: string;
}

export class DeviceService {
  /**
   * Register a new device for a user
   */
  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    // Get user and tenant info
    const user = await prisma.tenantUser.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
        devices: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check device limit
    if (user.devices.length >= user.tenant.maxDevicesPerUser) {
      throw new Error(`Maximum ${user.tenant.maxDevicesPerUser} devices allowed per user`);
    }

    // Get available server (for now, use first active server)
    const server = await this.getAvailableServer();
    if (!server) {
      throw new Error('No available servers');
    }

    // Generate WireGuard keypair
    const keyPair = await wireguardService.generateKeyPair();

    // Allocate IP from pool
    const assignedIp = await this.allocateIp(server.id);
    if (!assignedIp) {
      throw new Error('No available IP addresses');
    }

    // Encrypt private key before storing
    const privateKeyEncrypted = encryptPrivateKey(keyPair.privateKey);

    // Create device in database
    const device = await prisma.device.create({
      data: {
        tenantUserId: userId,
        deviceName: dto.deviceName,
        publicKey: keyPair.publicKey,
        privateKeyEncrypted,
        assignedIp,
        serverId: server.id,
        status: 'ACTIVE',
      },
      include: {
        server: true,
      },
    });

    // Add peer to WireGuard server
    try {
      await wireguardService.addPeer({
        publicKey: keyPair.publicKey,
        ipAddress: assignedIp,
      });
    } catch (error) {
      // Rollback: delete device if WireGuard setup fails
      await prisma.device.delete({ where: { id: device.id } });
      throw new Error(`Failed to configure VPN: ${error}`);
    }

    // Generate full client configuration
    const config = wireguardService.generateClientConfig(
      keyPair.privateKey,
      assignedIp,
      server.publicKey
    );

    return {
      id: device.id,
      deviceName: device.deviceName,
      assignedIp: device.assignedIp,
      config,
      lastConnectedAt: device.lastConnectedAt,
      createdAt: device.createdAt,
      server: {
        region: server.region,
        publicIp: server.publicIp,
        endpointPort: server.endpointPort,
      },
    };
  }

  /**
   * Get user's devices
   */
  async getUserDevices(userId: string) {
    const devices = await prisma.device.findMany({
      where: {
        tenantUserId: userId,
        status: 'ACTIVE',
      },
      include: {
        server: true,
      },
    });

    // Generate config for each device
    return devices.map(device => {
      // Decrypt private key
      const privateKey = decryptPrivateKey(device.privateKeyEncrypted);
      
      // Generate config
      const config = wireguardService.generateClientConfig(
        privateKey,
        device.assignedIp,
        device.server.publicKey
      );

      return {
        id: device.id,
        deviceName: device.deviceName,
        assignedIp: device.assignedIp,
        config,
        lastConnectedAt: device.lastConnectedAt,
        createdAt: device.createdAt,
        server: {
          region: device.server.region,
          publicIp: device.server.publicIp,
          endpointPort: device.server.endpointPort,
        },
      };
    });
  }

  /**
   * Delete a device
   */
  async deleteDevice(deviceId: string, userId: string) {
    const device = await prisma. device.findFirst({
      where: {
        id: deviceId,
        tenantUserId: userId,
      },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    // Remove peer from WireGuard server
    try {
      await wireguardService.removePeer(device.publicKey);
    } catch (error) {
      console.error('Failed to remove peer from WireGuard:', error);
      // Continue with deletion even if WireGuard removal fails
    }

    // Delete device and free IP
    await prisma.device.update({
      where: { id: deviceId },
      data: { status: 'REVOKED' },
    });

    await this.freeIp(device.assignedIp, device.serverId);

    return { message: 'Device deleted successfully' };
  }

  /**
   * Get device with decrypted config
   */
  async getDeviceConfig(deviceId: string, userId: string) {
    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        tenantUserId: userId,
        status: 'ACTIVE',
      },
      include: {
        server: true,
      },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    // Decrypt private key
    const privateKey = decryptPrivateKey(device.privateKeyEncrypted);

    // Generate config
    const config = wireguardService.generateClientConfig(
      privateKey,
      device.assignedIp,
      device.server.publicKey
    );

    return {
      config,
      assignedIp: device.assignedIp,
      server: {
        ip: device.server.publicIp,
        port: device.server.endpointPort,
        region: device.server.region,
      },
    };
  }

  /**
   * Get available server (simple load balancing)
   */
  private async getAvailableServer() {
    return prisma.server.findFirst({
      where: {
        status: 'ACTIVE',
        currentLoad: {
          lt: prisma.server.fields.capacity,
        },
      },
      orderBy: {
        currentLoad: 'asc',
      },
    });
  }

  /**
   * Allocate IP from pool
   */
  private async allocateIp(serverId: string): Promise<string | null> {
    // Get all allocated IPs for this server
    const allocatedDevices = await prisma.device.findMany({
      where: {
        serverId,
        status: 'ACTIVE',
      },
      select: {
        assignedIp: true,
      },
    });

    const allocatedIps = allocatedDevices.map((d: any) => d.assignedIp);
    const nextIp = getNextAvailableIp(allocatedIps);

    if (!nextIp) {
      return null;
    }

    return nextIp;
  }

  /**
   * Free IP back to pool
   */
  private async freeIp(ipAddress: string, serverId: string) {
    await prisma.ipPool.updateMany({
      where: {
        ipAddress,
        serverId,
      },
      data: {
        status: 'AVAILABLE',
        deviceId: null,
        allocatedAt: null,
      },
    });
  }
}

export const deviceService = new DeviceService();
