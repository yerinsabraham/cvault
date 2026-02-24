"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seed...\n');
    // 1. Create VPN Server
    console.log('📡 Creating VPN server...');
    // Check if server already exists
    let server = await prisma.server.findFirst({
        where: { publicIp: '165.22.138.31' },
    });
    if (!server) {
        server = await prisma.server.create({
            data: {
                name: 'US-East-Primary',
                region: 'us-east',
                publicIp: '165.22.138.31',
                publicKey: 'ugJvPBwy++vfwEl31oGjoio5Vx2T+DLvdPqfcuzyRU8=',
                endpointPort: 51820,
                capacity: 500,
                currentLoad: 0,
                status: 'ACTIVE',
            },
        });
    }
    console.log(`✅ Server created: ${server.name} (${server.publicIp})\n`);
    // 2. Create IP Pool (10.8.0.2 to 10.8.0.254 for now - can expand later)
    console.log('🔢 Creating IP pool (10.8.0.2 - 10.8.0.254)...');
    // Check if IP pool already exists
    const existingIps = await prisma.ipPool.count();
    if (existingIps === 0) {
        const ipPromises = [];
        for (let i = 2; i <= 254; i++) {
            const ipAddress = `10.8.0.${i}`;
            ipPromises.push(prisma.ipPool.create({
                data: {
                    ipAddress,
                    serverId: server.id,
                    status: 'AVAILABLE',
                },
            }));
        }
        await Promise.all(ipPromises);
        console.log(`✅ Created 253 IP addresses in pool\n`);
    }
    else {
        console.log(`✅ IP pool already exists (${existingIps} addresses)\n`);
    }
    // 3. Create Test Tenant
    console.log('🏢 Creating test tenant...');
    // Check if test tenant already exists
    let tenant = await prisma.tenant.findFirst({
        where: { name: 'Test Company Inc' },
    });
    let apiSecret = '';
    if (!tenant) {
        const apiKey = crypto.randomBytes(32).toString('hex');
        apiSecret = 'test-secret-' + crypto.randomBytes(16).toString('hex');
        const apiSecretHash = crypto.createHash('sha256').update(apiSecret).digest('hex');
        tenant = await prisma.tenant.create({
            data: {
                name: 'Test Company Inc',
                apiKey,
                apiSecretHash,
                status: 'ACTIVE',
                bandwidthLimitGb: null, // Unlimited for testing
                userLimit: null, // Unlimited for testing
                maxDevicesPerUser: 10,
                whitelabelConfig: {
                    brandName: 'Test VPN',
                    primaryColor: '#4F46E5',
                    logoUrl: 'https://example.com/logo.png',
                },
            },
        });
        console.log(`✅ Tenant created: ${tenant.name}`);
        console.log(`   API Key: ${tenant.apiKey}`);
        console.log(`   API Secret: ${apiSecret}\n`);
    }
    else {
        console.log(`✅ Tenant already exists: ${tenant.name}`);
        console.log(`   API Key: ${tenant.apiKey}\n`);
    }
    // 4. Save credentials to file for easy access
    if (apiSecret) {
        const credentialsPath = '../TEST_CREDENTIALS.md';
        const credentials = `# CVault Test Credentials

## Test Tenant
- **Name**: ${tenant.name}
- **Tenant ID**: ${tenant.id}
- **API Key**: \`${tenant.apiKey}\`
- **API Secret**: \`${apiSecret}\`
- **Status**: ${tenant.status}

## VPN Server
- **Name**: ${server.name}
- **IP**: ${server.publicIp}
- **Port**: ${server.endpointPort}
- **Region**: ${server.region}
- **Public Key**: \`${server.publicKey}\`

## Database
- **Host**: localhost:5433
- **Database**: cvault
- **User**: cvault
- **Password**: cvault_dev_password

## Quick Test Commands

### 1. Register a User
\`\`\`bash
curl -X POST http://localhost:3000/api/v1/auth/register \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${tenant.apiKey}" \\
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
\`\`\`

### 2. Login
\`\`\`bash
curl -X POST http://localhost:3000/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${tenant.apiKey}" \\
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
\`\`\`

Save the JWT token from the response as JWT_TOKEN, then:

### 3. Register a Device
\`\`\`bash
curl -X POST http://localhost:3000/api/v1/devices \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${tenant.apiKey}" \\
  -H "Authorization: Bearer JWT_TOKEN" \\
  -d '{
    "deviceName": "My Test Device",
    "deviceType": "macOS"
  }'
\`\`\`

### 4. List Devices
\`\`\`bash
curl -X GET http://localhost:3000/api/v1/devices \\
  -H "X-API-Key: ${tenant.apiKey}" \\
  -H "Authorization: Bearer JWT_TOKEN"
\`\`\`

### 5. Connect to VPN
\`\`\`bash
curl -X POST http://localhost:3000/api/v1/vpn/connect \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${tenant.apiKey}" \\
  -H "Authorization: Bearer JWT_TOKEN" \\
  -d '{
    "deviceId": "DEVICE_ID_FROM_STEP_3"
  }'
\`\`\`

### 6. Check VPN Status
\`\`\`bash
curl -X GET http://localhost:3000/api/v1/vpn/status \\
  -H "X-API-Key: ${tenant.apiKey}" \\
  -H "Authorization: Bearer JWT_TOKEN"
\`\`\`

---

**Generated**: ${new Date().toISOString()}
`;
        fs.writeFileSync(credentialsPath, credentials);
        console.log(`📄 Credentials saved to: ${credentialsPath}\n`);
    }
    else {
        console.log(`📄 Tenant already exists, credentials file not updated\n`);
    }
    console.log('✨ Seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Servers: 1`);
    console.log(`   - IP Pool: 253 addresses`);
    console.log(`   - Tenants: 1`);
    console.log(`\n🚀 You can now start the backend: npm run dev\n`);
}
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map