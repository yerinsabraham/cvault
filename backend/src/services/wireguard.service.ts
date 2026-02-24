import { NodeSSH } from 'node-ssh';
import { config } from '../config';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface WireGuardKeyPair {
  privateKey: string;
  publicKey: string;
}

export interface WireGuardPeerConfig {
  publicKey: string;
  ipAddress: string;
  allowedIps?: string;
}

export class WireGuardService {
  private ssh: NodeSSH;
  
  constructor() {
    this.ssh = new NodeSSH();
  }

  async connect(): Promise<void> {
    try {
      await this.ssh.connect({
        host: config.wgServerSshHost,
        username: config.wgServerSshUser,
        privateKeyPath: config.wgServerSshKeyPath,
      });
    } catch (error) {
      throw new Error(`Failed to connect to WireGuard server: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.ssh.dispose();
  }

  /**
   * Generate a WireGuard keypair locally (faster than SSH)
   */
  async generateKeyPair(): Promise<WireGuardKeyPair> {
    try {
      const { stdout: privateKey } = await execAsync('wg genkey');
      const { stdout: publicKey } = await execAsync(`echo "${privateKey.trim()}" | wg pubkey`);
      
      return {
        privateKey: privateKey.trim(),
        publicKey: publicKey.trim(),
      };
    } catch (error) {
      throw new Error(`Failed to generate WireGuard keypair: ${error}`);
    }
  }

  /**
   * Add a peer to the WireGuard server
   */
  async addPeer(peer: WireGuardPeerConfig): Promise<void> {
    await this.ensureConnected();
    
    const allowedIps = peer.allowedIps || `${peer.ipAddress}/32`;
    const command = `wg set wg0 peer ${peer.publicKey} allowed-ips ${allowedIps}`;
    
    try {
      const result = await this.ssh.execCommand(command);
      if (result.code !== 0) {
        throw new Error(`Failed to add peer: ${result.stderr}`);
      }
      
      // Persist configuration
      await this.ssh.execCommand('wg-quick save wg0');
    } catch (error) {
      throw new Error(`Failed to add WireGuard peer: ${error}`);
    }
  }

  /**
   * Remove a peer from the WireGuard server
   */
  async removePeer(publicKey: string): Promise<void> {
    await this.ensureConnected();
    
    const command = `wg set wg0 peer ${publicKey} remove`;
    
    try {
      const result = await this.ssh.execCommand(command);
      if (result.code !== 0) {
        throw new Error(`Failed to remove peer: ${result.stderr}`);
      }
      
      // Persist configuration
      await this.ssh.execCommand('wg-quick save wg0');
    } catch (error) {
      throw new Error(`Failed to remove WireGuard peer: ${error}`);
    }
  }

  /**
   * Get current server status and peer count
   */
  async getServerStatus(): Promise<{ peerCount: number; status: string }> {
    await this.ensureConnected();
    
    try {
      const result = await this.ssh.execCommand('wg show wg0 peers | wc -l');
      const peerCount = parseInt(result.stdout.trim());
      
      return {
        peerCount,
        status: 'active',
      };
    } catch (error) {
      return {
        peerCount: 0,
        status: 'error',
      };
    }
  }

  /**
   * Generate full client configuration
   */
  generateClientConfig(privateKey: string, clientIp: string, serverPublicKey?: string): string {
    const pubKey = serverPublicKey || config.wgServerPublicKey;
    
    return `[Interface]
PrivateKey = ${privateKey}
Address = ${clientIp}/32
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = ${pubKey}
Endpoint = ${config.wgServerIp}:${config.wgServerEndpointPort}
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
`;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.ssh.isConnected()) {
      await this.connect();
    }
  }
}

// Singleton instance
export const wireguardService = new WireGuardService();
