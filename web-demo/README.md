# CVault Web Demo

A reference web application demonstrating CVault VPN platform integration for businesses.

## Overview

This is a **demo application** built to showcase how businesses can integrate CVault's multi-tenant VPN platform into their web applications. It demonstrates:

- Multi-tenant authentication
- Device registration with automatic WireGuard provisioning
- VPN session tracking
- Configuration management
- Real-time status updates

**Note:** Web browsers cannot create actual VPN tunnels due to security restrictions. This demo shows the API integration and management interface. Users download WireGuard configuration files to use with the native WireGuard client.

## Features

✅ **API Key Configuration** - Secure tenant authentication  
✅ **User Authentication** - Register and login flow  
✅ **Device Management** - Register devices and get WireGuard configs  
✅ **VPN Dashboard** - View connection status and statistics  
✅ **Config Download** - Download/copy WireGuard configuration files  
✅ **Real-time Updates** - Auto-refresh device and connection status  
✅ **Responsive Design** - Works on desktop and mobile browsers  

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing
- **CVault SDK** - API integration

## Prerequisites

- Node.js 16+ installed
- CVault backend API running on `localhost:3000`
- CVault API key (demo key provided)

## Installation

```bash
cd web-demo
npm install
```

## Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Building for Production

```bash
npm run build
```

Build output will be in the `dist/` directory.

## Usage

### 1. Enter API Key

When you first open the app, you'll be prompted to enter your CVault API key.

**For testing:** Click "Use Demo API Key" to use the pre-configured test tenant.

### 2. Authenticate

Register a new account or login with existing credentials.

**Demo credentials:**
```
Email: test@example.com
Password: SecurePass123!
```

### 3. Register a Device

Click "+ Add Device" and enter a name for your device (e.g., "My Laptop"). The system will:
- Generate a WireGuard keypair
- Allocate an IP address
- Add the peer to the VPN server
- Return a complete WireGuard configuration

### 4. View Configuration

Click the "Config" button on any device to:
- View the WireGuard configuration
- Download the `.conf` file
- Copy to clipboard

### 5. Track Connections

Click "Connect" to create a VPN session record. The dashboard will show:
- Active connections
- Connection time
- Device details
- Server information

**Note:** Since this is a web app, clicking "Connect" only tracks the session on the backend. To actually connect to the VPN, download the config and use the native WireGuard client.

## Project Structure

```
web-demo/
├── public/              # Static assets
├── src/
│   ├── context/         # React Context (CVault SDK state)
│   ├── pages/           # Page components
│   │   ├── ConfigPage.tsx    # API key entry
│   │   ├── AuthPage.tsx      # Login/register
│   │   └── DashboardPage.tsx # Main dashboard
│   ├── App.tsx          # Router and routes
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles (Tailwind)
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies
```

## How It Works

### 1. SDK Integration

The app uses the CVault JavaScript SDK (`@cvault/sdk-js`) linked from the parent directory:

```typescript
import CVault from '@cvault/sdk-js';

const cvault = new CVault({
  apiKey: 'your-tenant-api-key',
  baseUrl: 'http://localhost:3000',
});
```

### 2. State Management

The `CVaultContext` provides SDK state and methods throughout the app:

```typescript
const { cvault, user, devices, sessions, isAuthenticated } = useCVault();
```

### 3. Authentication Flow

```typescript
// Register
const { user, accessToken } = await cvault.auth.register({
  email, password
});

// Login
const { user, accessToken } = await cvault.auth.login({
  email, password
});

// Store token
localStorage.setItem('cvault_token', accessToken);
```

### 4. Device Registration

```typescript
const device = await cvault.devices.register({
  deviceName: 'My Device',
  deviceType: 'Web'
});

// device.config contains full WireGuard configuration
// device.assignedIp contains allocated IP
```

### 5. VPN Connection Tracking

```typescript
// Start tracking
await cvault.vpn.connect({ deviceId: device.id });

// Check status
const status = await cvault.vpn.status();

// Stop tracking
await cvault.vpn.disconnect(deviceId);
```

## API Endpoints Used

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/devices` - List devices
- `POST /api/v1/devices` - Register device
- `POST /api/v1/vpn/connect` - Track connection
- `POST /api/v1/vpn/disconnect` - End connection
- `GET /api/v1/vpn/status` - Get active sessions
- `GET /api/v1/vpn/server/status` - Get server stats

## Security Notes

1. **API Key Storage** - Stored in `localStorage` (not suitable for production)
2. **JWT Token** - Stored in `localStorage` (consider httpOnly cookies for production)
3. **HTTPS** - Use HTTPS in production
4. **CORS** - Configure appropriate CORS settings

## For Production Deployment

Before deploying to production:

1. ✅ Use environment variables for API endpoints
2. ✅ Implement proper token storage (httpOnly cookies)
3. ✅ Enable HTTPS
4. ✅ Add proper error boundaries
5. ✅ Implement refresh tokens
6. ✅ Add loading states
7. ✅ Add analytics
8. ✅ Optimize bundle size

## Customization

### Branding

Customize colors in `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // Your brand colors
      },
    },
  },
},
```

### API Endpoint

Update the base URL in `CVaultContext.tsx`:

```typescript
baseUrl: 'https://api.your-domain.com',
```

## Troubleshooting

### Cannot connect to backend

Make sure the CVault backend is running:
```bash
cd backend
npm run dev
```

### API key not working

Verify your API key is correct. For testing, use the demo key:
```
a148620c598895d8a1bde0d6c7e18735c5c3db63be4e4e10cf7c3376feb49245
```

### CORS errors

The backend must allow requests from `http://localhost:5173`. Check CORS configuration in the backend.

## License

MIT

## Related

- [CVault Backend API](../backend)
- [CVault JavaScript SDK](../sdk-js)
- [CVault Documentation](../cvault_document.md)
