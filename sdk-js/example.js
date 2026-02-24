"use strict";
/**
 * CVault SDK Example
 *
 * This example demonstrates using the CVault SDK to:
 * 1. Register/login a user
 * 2. Register a device
 * 3. Get WireGuard configuration
 * 4. Connect to VPN
 * 5. Check status
 *
 * Make sure your backend is running on http://localhost:3000
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("./src/index"));
const fs = __importStar(require("fs"));
// Configuration
const API_KEY = 'a148620c598895d8a1bde0d6c7e18735c5c3db63be4e4e10cf7c3376feb49245';
const BASE_URL = 'http://localhost:3000';
async function main() {
    console.log('🚀 CVault SDK Example\n');
    // Initialize SDK
    const cvault = new index_1.default({
        apiKey: API_KEY,
        baseUrl: BASE_URL,
        debug: true,
    });
    console.log('✅ SDK initialized\n');
    // Check backend health
    console.log('📡 Checking backend health...');
    const health = await cvault.health();
    console.log('Backend status:', health.status);
    console.log('');
    // Login (user already exists from seed data)
    console.log('🔐 Logging in...');
    const { user, accessToken } = await cvault.auth.login({
        email: 'test@example.com',
        password: 'SecurePass123!',
    });
    console.log('✅ Logged in as:', user.email);
    console.log('User ID:', user.id);
    console.log('Tenant ID:', user.tenantId);
    console.log('Token:', accessToken.substring(0, 20) + '...');
    console.log('');
    // List existing devices
    console.log('📱 Listing existing devices...');
    const { devices: existingDevices, totalCount } = await cvault.devices.list();
    console.log(`Found ${totalCount} device(s)`);
    existingDevices.forEach(device => {
        console.log(`  - ${device.deviceName}: ${device.assignedIp}`);
    });
    console.log('');
    // Register a new device
    console.log('📱 Registering new device...');
    const device = await cvault.devices.register({
        deviceName: `SDK Test Device ${Date.now()}`,
        deviceType: 'macOS',
    });
    console.log('✅ Device registered!');
    console.log('Device ID:', device.id);
    console.log('Device Name:', device.deviceName);
    console.log('Assigned IP:', device.assignedIp);
    console.log('Server:', `${device.server.publicIp}:${device.server.port} (${device.server.region})`);
    console.log('');
    // Save WireGuard config to file
    const configPath = `./sdk_test_device_${Date.now()}.conf`;
    fs.writeFileSync(configPath, device.config);
    console.log('💾 WireGuard config saved to:', configPath);
    console.log('');
    // Connect to VPN (this just tracks the session on backend)
    console.log('🔌 Connecting to VPN...');
    const connection = await cvault.vpn.connect({
        deviceId: device.id,
    });
    console.log('✅ Connected!');
    console.log('Session ID:', connection.sessionId);
    console.log('Connected at:', connection.connectedAt);
    console.log('Status:', connection.status);
    console.log('');
    // Check VPN status
    console.log('📊 Checking VPN status...');
    const status = await cvault.vpn.status();
    console.log(`Total connected devices: ${status.connectedDevices}`);
    console.log('Active sessions:');
    status.sessions.forEach((session, index) => {
        console.log(`\n  Session ${index + 1}:`);
        console.log(`    ID: ${session.id}`);
        console.log(`    Device: ${session.device.deviceName}`);
        console.log(`    IP: ${session.device.assignedIp}`);
        console.log(`    Server: ${session.server.region} (${session.server.publicIp})`);
        console.log(`    Status: ${session.status}`);
    });
    console.log('');
    // Get server status
    console.log('🖥️  Checking server status...');
    const serverStatus = await cvault.vpn.serverStatus();
    console.log('Active peers on VPN server:', serverStatus.server.peerCount);
    console.log('Server status:', serverStatus.server.status);
    console.log('');
    // Disconnect
    console.log('🔌 Disconnecting...');
    const disconnectResponse = await cvault.vpn.disconnect(device.id);
    console.log('✅ Disconnected');
    console.log('Status:', disconnectResponse.status);
    console.log('');
    // List all devices after registration
    console.log('📱 Final device list...');
    const { devices: finalDevices } = await cvault.devices.list();
    console.log(`Total devices: ${finalDevices.length}`);
    finalDevices.forEach(device => {
        console.log(`  - ${device.deviceName}: ${device.assignedIp}`);
    });
    console.log('');
    console.log('🎉 Example completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Use the WireGuard config file to connect:');
    console.log(`   sudo wg-quick up ${configPath}`);
    console.log('2. Test your connection:');
    console.log('   curl ifconfig.me');
    console.log('3. Disconnect:');
    console.log(`   sudo wg-quick down ${configPath}`);
}
// Run the example
main().catch(error => {
    console.error('❌ Error:', error);
    if (error.code) {
        console.error('Error code:', error.code);
    }
    if (error.statusCode) {
        console.error('HTTP status:', error.statusCode);
    }
    process.exit(1);
});
