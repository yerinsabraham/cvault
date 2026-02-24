import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { wireguardService } from '../services/wireguard.service';
import { licenseService } from '../services/license.service';
import { fullAuth } from '../middleware/auth.middleware';
import { licenseCheck } from '../middleware/license.middleware';

const connectSchema = z.object({
  deviceId: z.string().uuid(),
});

export async function vpnRoutes(fastify: FastifyInstance) {
  // Initiate VPN connection for a device
  fastify.post('/connect', {
    preHandler: [fullAuth, licenseCheck],
    handler: async (request, reply) => {
      try {
        const body = connectSchema.parse(request.body);
        const userId = ((request as any).user as any).id;
        
        // Verify device belongs to user
        const device = await prisma.device.findFirst({
          where: {
            id: body.deviceId,
            tenantUser: {
              id: userId,
            },
            status: 'ACTIVE',
          },
          include: {
            tenantUser: {
              include: {
                tenant: true,
              },
            },
          },
        });

        if (!device) {
          return reply.status(404).send({
            error: 'Device Not Found',
            message: 'Device not found or inactive',
          });
        }

        // Create new session
        const session = await prisma.session.create({
          data: {
            deviceId: device.id,
            serverId: device.serverId,
            tenantId: device.tenantUser.tenantId,
            connectedAt: new Date(),
            status: 'ACTIVE',
          },
        });

        // Increment license usage counter
        const licenseInfo = (request as any).license as { key: string } | undefined;
        if (licenseInfo?.key) {
          await licenseService.incrementUsage(licenseInfo.key).catch(() => {
            // Non-fatal: log but don't fail the connection
            fastify.log.warn(`Failed to increment license usage for key: ${licenseInfo.key}`);
          });
        }

        return reply.send({
          sessionId: session.id,
          status: 'connected',
          connectedAt: session.connectedAt,
          message: 'VPN connection established',
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation Error',
            details: error.errors,
          });
        }
        
        return reply.status(500).send({
          error: 'Connection Failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // Disconnect VPN session
  fastify.post('/disconnect', {
    preHandler: [fullAuth],
    handler: async (request, reply) => {
      try {
        const body = connectSchema.parse(request.body);
        const userId = ((request as any).user as any).id;
        
        // Verify device belongs to user
        const device = await prisma.device.findFirst({
          where: {
            id: body.deviceId,
            tenantUser: {
              id: userId,
            },
          },
        });

        if (!device) {
          return reply.status(404).send({
            error: 'Device Not Found',
            message: 'Device not found',
          });
        }

        // Find and update active session
        const session = await prisma.session.findFirst({
          where: {
            deviceId: device.id,
            status: 'ACTIVE',
          },
        });

        if (!session) {
          return reply.status(404).send({
            error: 'No Active Session',
            message: 'No active VPN session found for this device',
          });
        }

        await prisma.session.update({
          where: {
            id: session.id,
          },
          data: {
            disconnectedAt: new Date(),
            status: 'DISCONNECTED',
          },
        });

        return reply.send({
          sessionId: session.id,
          status: 'disconnected',
          disconnectedAt: session.disconnectedAt,
          message: 'VPN disconnected successfully',
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation Error',
            details: error.errors,
          });
        }
        
        return reply.status(500).send({
          error: 'Disconnect Failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // Get VPN connection status for user's devices
  fastify.get('/status', {
    preHandler: [fullAuth],
    handler: async (request, reply) => {
      try {
        const userId = ((request as any).user as any).id;
        
        // Get all active sessions for user's devices
        const sessions = await prisma.session.findMany({
          where: {
            device: {
              tenantUser: {
                id: userId,
              },
            },
            status: 'ACTIVE',
          },
          include: {
            device: {
              select: {
                id: true,
                deviceName: true,
                publicKey: true,
                assignedIp: true,
              },
            },
            server: {
              select: {
                id: true,
                publicIp: true,
                endpointPort: true,
                region: true,
              },
            },
          },
          orderBy: {
            connectedAt: 'desc',
          },
        });

        return reply.send({
          sessions,
          connectedDevices: sessions.length,
        });
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to retrieve status',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // Get server status (WireGuard server info)
  fastify.get('/server/status', {
    preHandler: [fullAuth],
    handler: async (_request, reply) => {
      try {
        const status = await wireguardService.getServerStatus();

        return reply.send({
          server: status,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to retrieve server status',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
}
