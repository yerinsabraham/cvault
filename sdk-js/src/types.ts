/**
 * CVault SDK Types
 * 
 * Type definitions for the CVault multi-tenant VPN SDK
 */

/**
 * SDK Configuration
 */
export interface CVaultConfig {
  /** Tenant API key */
  apiKey: string;
  /** Tenant API secret (optional, for server-side usage) */
  apiSecret?: string;
  /** Base API URL */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * User Authentication
 */
export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface User {
  id: string;
  email: string;
  tenantId: string;
  createdAt: string;
}

/**
 * Device Management
 */
export interface RegisterDeviceRequest {
  deviceName: string;
  deviceType?: string;
}

export interface Device {
  id: string;
  deviceName: string;
  deviceType?: string;
  assignedIp: string;
  config: string;  // WireGuard configuration
  server: ServerInfo;
  lastConnectedAt?: string;
  createdAt: string;
}

export interface DeviceListResponse {
  devices: Device[];
  totalCount: number;
}

/**
 * VPN Connection
 */
export interface ConnectRequest {
  deviceId: string;
  serverRegion?: string;
}

export interface ConnectResponse {
  sessionId: string;
  status: string;
  connectedAt: string;
  message: string;
}

export interface DisconnectRequest {
  deviceId: string;
}

export interface DisconnectResponse {
  sessionId: string;
  status: string;
  message: string;
}

export interface VPNStatus {
  sessions: VPNSession[];
  connectedDevices: number;
}

export interface VPNSession {
  id: string;
  status: SessionStatus;
  connectedAt: string;
  disconnectedAt?: string;
  device: {
    id: string;
    deviceName: string;
    assignedIp: string;
  };
  server: {
    id: string;
    publicIp: string;
    endpointPort: number;
    region: string;
  };
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  DISCONNECTED = 'DISCONNECTED',
}

/**
 * Server Information
 */
export interface ServerInfo {
  id: string;
  name: string;
  region: string;
  publicIp?: string;
  port?: number;
}

export interface ServerListResponse {
  servers: ServerInfo[];
}

export interface ServerStatusResponse {
  server: {
    peerCount: number;
    status: string;
  };
  timestamp: string;
}

/**
 * Usage Metrics
 */
export interface UsageMetrics {
  tenantId: string;
  totalUsers: number;
  totalDevices: number;
  bandwidthUsedGb: number;
  connectionsCount: number;
  period: {
    start: string;
    end: string;
  };
}

/**
 * Error Response
 */
export interface CVaultError {
  code: string;
  message: string;
  statusCode?: number;
  details?: any;
}

/**
 * SDK Error Codes
 */
export enum ErrorCode {
  INVALID_API_KEY = 'INVALID_API_KEY',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TENANT_SUSPENDED = 'TENANT_SUSPENDED',
  BANDWIDTH_LIMIT_EXCEEDED = 'BANDWIDTH_LIMIT_EXCEEDED',
  USER_LIMIT_EXCEEDED = 'USER_LIMIT_EXCEEDED',
  DEVICE_LIMIT_EXCEEDED = 'DEVICE_LIMIT_EXCEEDED',
  SERVER_UNAVAILABLE = 'SERVER_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Event Types for SDK listeners
 */
export enum CVaultEvent {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  STATUS_CHANGED = 'status_changed',
}

export type EventListener = (data: any) => void;
