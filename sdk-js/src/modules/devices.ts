import { HttpClient } from '../http-client';
import {
  RegisterDeviceRequest,
  Device,
  DeviceListResponse,
} from '../types';

/**
 * Device management module
 * Handles device registration, listing, and configuration
 */
export class DevicesModule {
  constructor(private http: HttpClient) {}

  /**
   * Register a new device and get WireGuard configuration
   * Requires authentication
   * @param request - Device registration details
   * @returns Device with WireGuard config
   */
  async register(request: RegisterDeviceRequest): Promise<Device> {
    return this.http.post<Device>('/api/v1/devices', request, true);
  }

  /**
   * List all devices for the current user
   * Requires authentication
   * @returns List of devices
   */
  async list(): Promise<DeviceListResponse> {
    return this.http.get<DeviceListResponse>('/api/v1/devices', true);
  }

  /**
   * Get a specific device by ID
   * Requires authentication
   * @param deviceId - Device UUID
   * @returns Device details
   */
  async get(deviceId: string): Promise<Device> {
    return this.http.get<Device>(`/api/v1/devices/${deviceId}`, true);
  }

  /**
   * Get WireGuard configuration for a device
   * Requires authentication
   * @param deviceId - Device UUID
   * @returns WireGuard configuration string
   */
  async getConfig(deviceId: string): Promise<string> {
    const response = await this.http.get<{ config: string }>(
      `/api/v1/devices/${deviceId}/config`,
      true
    );
    return response.config;
  }

  /**
   * Delete a device
   * Requires authentication
   * @param deviceId - Device UUID
   */
  async delete(deviceId: string): Promise<void> {
    await this.http.delete<void>(`/api/v1/devices/${deviceId}`, true);
  }

  /**
   * Update device name
   * Requires authentication
   * @param deviceId - Device UUID
   * @param deviceName - New device name
   * @returns Updated device
   */
  async updateName(deviceId: string, deviceName: string): Promise<Device> {
    return this.http.put<Device>(
      `/api/v1/devices/${deviceId}`,
      { deviceName },
      true
    );
  }
}
