import { HttpClient } from '../http-client';
import { ServerInfo, ServerListResponse } from '../types';

/**
 * Server management module
 * Handles VPN server discovery and information
 */
export class ServersModule {
  constructor(private http: HttpClient) {}

  /**
   * List all available VPN servers
   * Requires authentication
   * @returns List of available servers
   */
  async list(): Promise<ServerListResponse> {
    return this.http.get<ServerListResponse>('/api/v1/servers', true);
  }

  /**
   * Get information about a specific server
   * Requires authentication
   * @param serverId - Server UUID
   * @returns Server details
   */
  async get(serverId: string): Promise<ServerInfo> {
    return this.http.get<ServerInfo>(`/api/v1/servers/${serverId}`, true);
  }

  /**
   * Get servers by region
   * Requires authentication
   * @param region - Region code (e.g., 'us-east', 'eu-west')
   * @returns List of servers in the region
   */
  async getByRegion(region: string): Promise<ServerListResponse> {
    return this.http.get<ServerListResponse>(
      `/api/v1/servers?region=${region}`,
      true
    );
  }
}
