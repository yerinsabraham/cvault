# CVault Backend API - Phase 2

Multi-tenant VPN control plane backend API built with Fastify, Prisma, and PostgreSQL.

## Architecture

This backend provides a REST API for managing:
- **Tenants**: Business customers who white-label CVault
- **Users**: End users of each tenant's VPN service
- **Devices**: User devices with VPN configurations
- **Sessions**: Active VPN connections
- **Servers**: WireGuard VPN servers

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- SSH access to VPN server (165.22.138.31)
- SSH key: `~/.ssh/cvault_vpn_server`

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Database

Using Docker (recommended for development):

```bash
docker-compose up -d postgres redis
```

Or use your own PostgreSQL instance and update `DATABASE_URL` in `.env`.

### 3. Run Database Migrations

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Health Check
```
GET /health
```

### Authentication
```
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### Device Management
```
POST   /api/v1/devices          # Register new device
GET    /api/v1/devices          # List user's devices
GET    /api/v1/devices/:id/config  # Get WireGuard config
DELETE /api/v1/devices/:id      # Delete device
```

### VPN Connection
```
POST /api/v1/vpn/connect        # Connect device
POST /api/v1/vpn/disconnect     # Disconnect device
GET  /api/v1/vpn/status        # Get active sessions
GET  /api/v1/vpn/server/status # Get WireGuard server info
```

## Authentication

### API Key (Tenant Authentication)
Required for all authentication endpoints. Pass in header:
```
X-API-Key: <tenant_api_key>
```

### JWT (User Authentication)
Required for device and VPN endpoints. Pass in header:
```
Authorization: Bearer <jwt_token>
```

## Example Usage

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_TENANT_API_KEY" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Register a Device

```bash
curl -X POST http://localhost:3000/api/v1/devices \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_TENANT_API_KEY" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "deviceName": "My iPhone",
    "deviceType": "iOS"
  }'
```

Response:
```json
{
  "device": {
    "id": "uuid",
    "name": "My iPhone",
    "assignedIp": "10.8.0.5",
    "publicKey": "..."
  },
  "config": "[Interface]\nPrivateKey = ...\nAddress = 10.8.0.5/16\n\n[Peer]\n..."
}
```

### 3. Connect to VPN

```bash
curl -X POST http://localhost:3000/api/v1/vpn/connect \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_TENANT_API_KEY" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "deviceId": "device-uuid"
  }'
```

## Database Schema

### Key Models
- **Tenant**: Business customer with API key
- **TenantUser**: End user belonging to a tenant
- **Device**: User's device with VPN config
- **Session**: Active VPN connection session
- **Server**: WireGuard server instance
- **IpPool**: Available IP addresses (10.8.0.0/16)
- **UsageMetric**: Connection duration & data transfer

### Relationships
```
Tenant (1) -> (N) TenantUser
TenantUser (1) -> (N) Device
Device (1) -> (1) Session
Server (1) -> (N) Device
Server (1) -> (N) IpPool
Device (1) -> (N) UsageMetric
```

## Development

### Run Prisma Studio
View and edit database data:
```bash
npm run prisma:studio
```

### Create Database Migration
```bash
npm run prisma:migrate
```

### Build for Production
```bash
npm run build
npm start
```

## Docker Deployment

### Build and Run All Services
```bash
docker-compose up -d
```

This starts:
- PostgreSQL database on port 5432
- Redis cache on port 6379
- Backend API on port 3000

### View Logs
```bash
docker-compose logs -f backend
```

### Stop Services
```bash
docker-compose down
```

## Environment Variables

Required variables in `.env`:

```env
NODE_ENV=development
DATABASE_URL=postgresql://cvault:password@localhost:5432/cvault
REDIS_URL=redis://localhost:6379

# JWT & Encryption
JWT_SECRET=your-jwt-secret-min-32-chars
ENCRYPTION_KEY=your-encryption-key-exactly-32chars!

# VPN Server
VPN_SERVER_HOST=165.22.138.31
VPN_SERVER_USER=root
VPN_SERVER_SSH_KEY_PATH=/root/.ssh/cvault_vpn_server

# API Configuration
PORT=3000
CORS_ORIGIN=http://localhost:3001
```

## Security Notes

1. **Never commit** `.env` file or SSH keys to git
2. Use strong random values for `JWT_SECRET` and `ENCRYPTION_KEY` in production
3. Enable HTTPS/TLS in production (use reverse proxy like nginx)
4. Rotate API keys periodically
5. Implement rate limiting per tenant
6. Monitor for unusual traffic patterns

## Testing

Create a test tenant manually in database:

```sql
INSERT INTO "Tenant" (id, name, "apiKey", status)
VALUES (
  gen_random_uuid(),
  'Test Tenant',
  encode(gen_random_bytes(32), 'hex'),
  'ACTIVE'
);
```

Then use the generated `apiKey` in your API requests.

## Next Steps (Phase 3+)

- [ ] Implement admin panel for tenant management
- [ ] Add WebSocket support for real-time connection status
- [ ] Create usage metering and analytics endpoints
- [ ] Implement automated server scaling
- [ ] Add monitoring with Prometheus/Grafana
- [ ] Create comprehensive test suite
- [ ] Set up CI/CD pipeline

## Support

For issues or questions, contact the CVault team.
