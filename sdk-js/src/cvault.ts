import { CVaultConfig } from './types';
import { HttpClient } from './http-client';
import { AuthModule } from './modules/auth';
import { DevicesModule } from './modules/devices';
import { VPNModule } from './modules/vpn';
import { ServersModule } from './modules/servers';

/**
 * CVault SDK
 * 
 * Main SDK class for interacting with CVault multi-tenant VPN platform
 * 
 * @example
 * ```typescript
 * import CVault from '@cvault/sdk-js';
 * 
 * const cvault = new CVault({
 *   apiKey: 'your-tenant-api-key',
 *   baseUrl: 'https://api.cvault.io'
 * });
 * 
 * // Register a user
 * const { user, accessToken } = await cvault.auth.register({
 *   email: 'user@example.com',
 *   password: 'secure_password'
 * });
 * 
 * // Register a device
 * const device = await cvault.devices.register({
 *   deviceName: 'My MacBook'
 * });
 * 
 * // Connect to VPN
 * const session = await cvault.vpn.connect({
 *   deviceId: device.id
 * });
 * ```
 */
export class CVault {
  private http: HttpClient;

  /** Authentication operations */
  public readonly auth: AuthModule;

  /** Device management operations */
  public readonly devices: DevicesModule;

  /** VPN connection operations */
  public readonly vpn: VPNModule;

  /** Server discovery operations */
  public readonly servers: ServersModule;

  /**
   * Create a new CVault SDK instance
   * @param config - SDK configuration
   */
  constructor(config: CVaultConfig) {
    // Validate configuration
    if (!config.apiKey) {
      throw new Error('CVault SDK: apiKey is required');
    }

    // Initialize HTTP client
    this.http = new HttpClient(config);

    // Initialize modules
    this.auth = new AuthModule(this.http);
    this.devices = new DevicesModule(this.http);
    this.vpn = new VPNModule(this.http);
    this.servers = new ServersModule(this.http);
  }

  /**
   * Get SDK version
   */
  static get version(): string {
    return '1.0.0';
  }

  /**
   * Check health of CVault API
   * @returns Health status
   */
  async health(): Promise<{ status: string; timestamp: string }> {
    return this.http.get<{ status: string; timestamp: string }>('/health');
  }
}

// Export as default
export default CVault;
