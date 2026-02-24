/**
 * CVault SDK - JavaScript/TypeScript
 * 
 * Multi-tenant VPN platform SDK for businesses to integrate CVault
 * into their applications.
 * 
 * @packageDocumentation
 */

// Export main SDK class
export { CVault, CVault as default } from './cvault';

// Export modules
export { AuthModule } from './modules/auth';
export { DevicesModule } from './modules/devices';
export { VPNModule } from './modules/vpn';
export { ServersModule } from './modules/servers';

// Export types
export * from './types';

// Export error class
export { CVaultError } from './error';

// Export HTTP client for advanced usage
export { HttpClient } from './http-client';
