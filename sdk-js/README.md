# CVault SDK - JavaScript/TypeScript

Official JavaScript/TypeScript SDK for the CVault multi-tenant VPN platform.

## Features

✅ **Multi-tenant support** - Secure API key authentication per tenant  
✅ **User management** - Register and authenticate users  
✅ **Device management** - Register devices and get WireGuard configs  
✅ **VPN connections** - Track and manage VPN sessions  
✅ **TypeScript** - Full type definitions included  
✅ **Event system** - Listen for connection events  
✅ **Error handling** - Comprehensive error codes  
✅ **Cross-platform** - Works in Node.js, browsers, and Electron  

## Installation

```bash
npm install @cvault/sdk-js
```

Or with yarn:

```bash
yarn add @cvault/sdk-js
```

## Quick Start

```typescript
import CVault from '@cvault/sdk-js';

// Initialize SDK with your tenant API key
const cvault = new CVault({
  apiKey: 'your-tenant-api-key',
  baseUrl: 'https://api.cvault.io'  // or your self-hosted URL
});

// Register a new user
const { user, accessToken } = await cvault.auth.register({
  email: 'user@example.com',
  password: 'secure_password'
});

// Or login existing user
const session = await cvault.auth.login({
  email: 'user@example.com',
  password: 'secure_password'
});

// Register a device and get WireGuard config
const device = await cvault.devices.register({
  deviceName: 'My MacBook Pro',
  deviceType: 'macOS'
});

console.log('WireGuard Config:', device.config);
console.log('Assigned IP:', device.assignedIp);

// Connect to VPN (tracks session on backend)
const connection = await cvault.vpn.connect({
  deviceId: device.id
});

// Check VPN status
const status = await cvault.vpn.status();
console.log('Connected devices:', status.connectedDevices);

// Disconnect
await cvault.vpn.disconnect(connection.sessionId);
```

## Configuration

```typescript
const cvault = new CVault({
  apiKey: 'your-tenant-api-key',      // Required: Your tenant API key
  apiSecret: 'your-api-secret',        // Optional: For server-side usage
  baseUrl: 'https://api.cvault.io',    // Optional: API endpoint
  timeout: 30000,                      // Optional: Request timeout (ms)
  debug: false                         // Optional: Enable debug logging
});
```

## API Reference

### Authentication

#### Register a User

```typescript
const { user, accessToken } = await cvault.auth.register({
  email: 'user@example.com',
  password: 'secure_password'
});
```

#### Login

```typescript
const { user, accessToken } = await cvault.auth.login({
  email: 'user@example.com',
  password: 'secure_password'
});
```

#### Logout

```typescript
cvault.auth.logout();
```

#### Restore Session

```typescript
// Save token to storage (e.g., localStorage)
localStorage.setItem('cvault_token', accessToken);

// Later, restore session
const token = localStorage.getItem('cvault_token');
cvault.auth.setAccessToken(token);
```

#### Check Authentication Status

```typescript
if (cvault.auth.isAuthenticated()) {
  console.log('User is logged in');
}
```

### Device Management

#### Register a Device

```typescript
const device = await cvault.devices.register({
  deviceName: 'My iPhone',
  deviceType: 'iOS'  // Optional
});

// Device object contains:
// - id: UUID
// - deviceName: string
// - assignedIp: string (e.g., "10.8.0.2")
// - config: string (WireGuard configuration)
// - server: { ip, port, region }
```

#### List Devices

```typescript
const { devices, totalCount } = await cvault.devices.list();

devices.forEach(device => {
  console.log(`${device.deviceName}: ${device.assignedIp}`);
});
```

#### Get Device

```typescript
const device = await cvault.devices.get(deviceId);
```

#### Get WireGuard Config

```typescript
const config = await cvault.devices.getConfig(deviceId);
console.log(config);  // Full WireGuard config string
```

#### Delete Device

```typescript
await cvault.devices.delete(deviceId);
```

#### Update Device Name

```typescript
const updated = await cvault.devices.updateName(deviceId, 'New Device Name');
```

### VPN Connections

#### Connect to VPN

```typescript
const connection = await cvault.vpn.connect({
  deviceId: device.id,
  serverRegion: 'us-east'  // Optional
});

console.log('Session ID:', connection.sessionId);
console.log('Connected at:', connection.connectedAt);
```

#### Disconnect from VPN

```typescript
await cvault.vpn.disconnect(sessionId);
```

#### Get VPN Status

```typescript
const status = await cvault.vpn.status();

console.log('Connected devices:', status.connectedDevices);
status.sessions.forEach(session => {
  console.log(`Device: ${session.device.deviceName}`);
  console.log(`IP: ${session.device.assignedIp}`);
  console.log(`Server: ${session.server.region}`);
});
```

#### Get Server Status

```typescript
const serverStatus = await cvault.vpn.serverStatus();
console.log('Active peers:', serverStatus.server.peerCount);
console.log('Server status:', serverStatus.server.status);
```

### Event Listeners

Listen for VPN events:

```typescript
// Connection established
cvault.vpn.on('connected', (data) => {
  console.log('Connected!', data);
});

// Connection closed
cvault.vpn.on('disconnected', (data) => {
  console.log('Disconnected', data);
});

// Status changed
cvault.vpn.on('status_changed', (status) => {
  console.log('VPN status updated', status);
});

// Errors
cvault.vpn.on('error', (error) => {
  console.error('VPN error:', error);
});

// Remove listener
cvault.vpn.off('connected', listener);

// Remove all listeners
cvault.vpn.removeAllListeners();
```

### Servers

#### List Available Servers

```typescript
const { servers } = await cvault.servers.list();

servers.forEach(server => {
  console.log(`${server.name}: ${server.region}`);
});
```

#### Get Server by Region

```typescript
const { servers } = await cvault.servers.getByRegion('us-east');
```

### Health Check

```typescript
const health = await cvault.health();
console.log(health.status);  // "ok"
```

## Error Handling

The SDK uses typed errors for better error handling:

```typescript
import { CVaultError, ErrorCode } from '@cvault/sdk-js';

try {
  await cvault.auth.login({ email, password });
} catch (error) {
  if (error instanceof CVaultError) {
    switch (error.code) {
      case ErrorCode.INVALID_CREDENTIALS:
        console.error('Wrong email or password');
        break;
      case ErrorCode.TENANT_SUSPENDED:
        console.error('Tenant account suspended');
        break;
      case ErrorCode.NETWORK_ERROR:
        console.error('Network request failed');
        break;
      default:
        console.error('Error:', error.message);
    }
  }
}
```

### Error Codes

- `INVALID_API_KEY` - Wrong tenant credentials
- `INVALID_CREDENTIALS` - Wrong user email/password
- `TENANT_SUSPENDED` - Business account suspended
- `BANDWIDTH_LIMIT_EXCEEDED` - Tenant over quota
- `USER_LIMIT_EXCEEDED` - Too many users
- `DEVICE_LIMIT_EXCEEDED` - User has too many devices
- `SERVER_UNAVAILABLE` - No servers available
- `UNAUTHORIZED` - Not authenticated
- `NOT_FOUND` - Resource not found
- `NETWORK_ERROR` - Connection failed
- `UNKNOWN_ERROR` - Unexpected error

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import CVault, { 
  CVaultConfig, 
  Device, 
  VPNStatus,
  AuthResponse 
} from '@cvault/sdk-js';

const config: CVaultConfig = {
  apiKey: 'your-key',
  baseUrl: 'https://api.cvault.io'
};

const cvault = new CVault(config);
const device: Device = await cvault.devices.register({
  deviceName: 'Test Device'
});
```

## Examples

### Complete User Flow

```typescript
import CVault from '@cvault/sdk-js';

async function setupVPN() {
  // 1. Initialize SDK
  const cvault = new CVault({
    apiKey: process.env.CVAULT_API_KEY!,
    baseUrl: 'http://localhost:3000'
  });

  // 2. Register/Login user
  const { accessToken } = await cvault.auth.login({
    email: 'test@example.com',
    password: 'SecurePass123!'
  });

  // 3. Register device
  const device = await cvault.devices.register({
    deviceName: 'My Test Device'
  });

  // 4. Save WireGuard config to file
  const fs = require('fs');
  fs.writeFileSync('vpn.conf', device.config);

  console.log('✅ VPN configured!');
  console.log('Device IP:', device.assignedIp);
  console.log('Config saved to: vpn.conf');

  // 5. Connect (tracks session)
  const connection = await cvault.vpn.connect({
    deviceId: device.id
  });

  console.log('✅ Connected! Session:', connection.sessionId);

  // 6. Check status
  const status = await cvault.vpn.status();
  console.log('Active devices:', status.connectedDevices);

  // 7. Disconnect later
  // await cvault.vpn.disconnect(connection.sessionId);
}

setupVPN().catch(console.error);
```

### React Integration

```typescript
import { useEffect, useState } from 'react';
import CVault from '@cvault/sdk-js';

function VPNComponent() {
  const [cvault] = useState(() => new CVault({
    apiKey: process.env.REACT_APP_CVAULT_API_KEY!
  }));
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Listen for connection events
    cvault.vpn.on('connected', () => setIsConnected(true));
    cvault.vpn.on('disconnected', () => setIsConnected(false));

    return () => {
      cvault.vpn.removeAllListeners();
    };
  }, [cvault]);

  const handleConnect = async (deviceId: string) => {
    try {
      await cvault.vpn.connect({ deviceId });
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={() => handleConnect('device-id')}>
        Connect
      </button>
    </div>
  );
}
```

### Node.js Backend Integration

```typescript
import CVault from '@cvault/sdk-js';
import express from 'express';

const app = express();
const cvault = new CVault({
  apiKey: process.env.CVAULT_API_KEY!,
  apiSecret: process.env.CVAULT_API_SECRET
});

app.post('/api/vpn/setup', async (req, res) => {
  try {
    // Register user in CVault
    const { user, accessToken } = await cvault.auth.register({
      email: req.body.email,
      password: req.body.password
    });

    // Set token for subsequent requests
    cvault.auth.setAccessToken(accessToken);

    // Register device
    const device = await cvault.devices.register({
      deviceName: req.body.deviceName
    });

    res.json({
      success: true,
      device: {
        id: device.id,
        ip: device.assignedIp,
        config: device.config
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

## Platform Support

- ✅ **Node.js** 16+
- ✅ **Modern browsers** (Chrome, Firefox, Safari, Edge)
- ✅ **Electron** apps
- ✅ **React Native** (with polyfills)

## Security Best Practices

1. **Never expose API keys in client-side code** - Use environment variables or backend proxy
2. **Store JWT securely** - Use httpOnly cookies or secure storage
3. **Clear tokens on logout** - Always call `cvault.auth.logout()`
4. **Use HTTPS** - Never use HTTP in production
5. **Validate SSL certificates** - Enabled by default
6. **Encrypt WireGuard configs** - Store encrypted at rest

## Development

```bash
# Install dependencies
npm install

# Build SDK
npm run build

# Watch mode (dev)
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## License

MIT

## Support

- 📧 Email: support@cvault.io
- 📚 Documentation: https://docs.cvault.io
- 💬 Discord: https://discord.gg/cvault
- 🐛 Issues: https://github.com/cvault/sdk-js/issues

## Related

- [CVault API Documentation](https://docs.cvault.io/api)
- [Flutter SDK](https://github.com/cvault/sdk-flutter)
- [iOS SDK](https://github.com/cvault/sdk-swift)
- [Android SDK](https://github.com/cvault/sdk-kotlin)
