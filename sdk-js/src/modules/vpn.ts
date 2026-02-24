import { HttpClient } from '../http-client';
import {
  ConnectRequest,
  ConnectResponse,
  DisconnectResponse,
  VPNStatus,
  ServerStatusResponse,
  CVaultEvent,
  EventListener,
} from '../types';

/**
 * VPN connection module
 * Handles VPN connections, status tracking, and events
 */
export class VPNModule {
  private eventListeners: Map<CVaultEvent, EventListener[]> = new Map();

  constructor(private http: HttpClient) {}

  /**
   * Connect to VPN with a registered device
   * Requires authentication
   * @param request - Connection details
   * @returns Connection session info
   */
  async connect(request: ConnectRequest): Promise<ConnectResponse> {
    const response = await this.http.post<ConnectResponse>(
      '/api/v1/vpn/connect',
      request,
      true
    );

    // Emit connected event
    this.emit(CVaultEvent.CONNECTED, response);

    return response;
  }

  /**
   * Disconnect from VPN
   * Requires authentication
   * @param deviceId - Device ID to disconnect
   * @returns Disconnection confirmation
   */
  async disconnect(deviceId: string): Promise<DisconnectResponse> {
    const response = await this.http.post<DisconnectResponse>(
      '/api/v1/vpn/disconnect',
      { deviceId },
      true
    );

    // Emit disconnected event
    this.emit(CVaultEvent.DISCONNECTED, response);

    return response;
  }

  /**
   * Get VPN connection status
   * Requires authentication
   * @returns Current VPN sessions and status
   */
  async status(): Promise<VPNStatus> {
    const status = await this.http.get<VPNStatus>('/api/v1/vpn/status', true);

    // Emit status changed event
    this.emit(CVaultEvent.STATUS_CHANGED, status);

    return status;
  }

  /**
   * Get VPN server status
   * Requires authentication
   * @returns Server health and peer count
   */
  async serverStatus(): Promise<ServerStatusResponse> {
    return this.http.get<ServerStatusResponse>('/api/v1/vpn/server/status', true);
  }

  /**
   * Listen for VPN events
   * @param event - Event type to listen for
   * @param listener - Callback function
   */
  on(event: CVaultEvent, listener: EventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   * @param event - Event type
   * @param listener - Callback function to remove
   */
  off(event: CVaultEvent, listener: EventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event to all listeners
   * @param event - Event type
   * @param data - Event data
   */
  private emit(event: CVaultEvent, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.eventListeners.clear();
  }
}
