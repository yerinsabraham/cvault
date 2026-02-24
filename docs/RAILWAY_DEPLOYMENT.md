# CVault Backend - Railway Deployment Guide

## Prerequisites
- Railway account (https://railway.app)
- GitHub repository with your code
- VPN server IP (165.22.138.31) with WireGuard configured

## Step 1: Create Railway Project

1. Go to https://railway.app and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account and select the `cvault` repository
5. Railway will auto-detect the Node.js backend

## Step 2: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will provision a managed PostgreSQL instance
4. Note: Connection string will be auto-injected as `DATABASE_URL`

## Step 3: Add Redis Database

1. Click "+ New" again
2. Select "Database" → "Redis"
3. Railway will provision a managed Redis instance
4. Note: Connection string will be auto-injected as `REDIS_URL`

## Step 4: Configure Environment Variables

In your Railway backend service, go to **Variables** and add:

### Required Variables (Railway auto-provides these):
- ✅ `DATABASE_URL` - Auto-generated from PostgreSQL
- ✅ `REDIS_URL` - Auto-generated from Redis

### Additional Required Variables:
```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-secure-random-jwt-secret-here

# VPN Server Configuration
WG_SERVER_IP=165.22.138.31
WG_SERVER_ENDPOINT_PORT=51820
WG_SERVER_PUBLIC_KEY=ugJvPBwy++vfwEl31oGjoio5Vx2T+DLvdPqfcuzyRU8=

# SSH Configuration (for WireGuard server management)
VPN_SERVER_HOST=165.22.138.31
VPN_SERVER_PORT=22
VPN_SERVER_USERNAME=root
VPN_SERVER_PRIVATE_KEY="-----BEGIN OPENSSH PRIVATE KEY-----
[Your SSH private key content here]
-----END OPENSSH PRIVATE KEY-----"

# CORS Configuration
CORS_ORIGIN=*
```

### How to Get Your SSH Private Key:
```bash
cat ~/.ssh/id_rsa
# Or if you have a specific key:
cat ~/.ssh/your_vpn_server_key
```

## Step 5: Set Root Directory

1. In Railway backend service settings
2. Go to **Settings** → **Build**
3. Set **Root Directory** to: `backend`
4. Set **Start Command** to: `npm run deploy`

## Step 6: Deploy

1. Click "Deploy" in Railway
2. Wait for build to complete (~2-3 minutes)
3. Railway will:
   - Install dependencies
   - Generate Prisma client
   - Build TypeScript
   - Push database schema
   - Start the server

## Step 7: Get Your Production URL

1. Go to **Settings** → **Networking**
2. Click "Generate Domain"
3. Railway will provide a URL like: `cvault-backend-production.up.railway.app`
4. Or add custom domain: `api.cvault.io`

## Step 8: Test Deployment

```bash
# Health check
curl https://your-railway-url.railway.app/

# Test API
curl https://your-railway-url.railway.app/api/v1/health
```

## Step 9: Seed Database (First Time Only)

Option A - Via Railway CLI:
```bash
railway login
railway link
railway run npm run prisma:seed
```

Option B - Via Direct Connection:
```bash
# Get DATABASE_URL from Railway Variables
DATABASE_URL="postgresql://..." npm run prisma:seed
```

## Step 10: Update Desktop App

Update `/Users/apple/creovine_main/cvault/desktop-client/lib/constants.dart`:

```dart
class AppConstants {
  // Production API
  static const String apiBaseUrl = 'https://your-railway-url.railway.app/api/v1';
  
  // Or with custom domain:
  // static const String apiBaseUrl = 'https://api.cvault.io/api/v1';
  
  // Demo credentials remain the same
  static const String demoApiKey = 'test_api_key_12345';
  static const String demoEmail = 'demo@example.com';
  static const String demoPassword = 'Demo123!@#';
}
```

## Monitoring & Logs

### View Logs:
1. Go to your Railway backend service
2. Click on **Deployments**
3. View real-time logs

### Monitor Performance:
1. Check **Metrics** tab for:
   - CPU usage
   - Memory usage
   - Network traffic

## Cost Estimate

Railway Free Tier:
- $5 credit/month
- Hobby plan: $5/month for backend
- PostgreSQL: Included
- Redis: Included

**Total: ~$5-10/month**

For production usage:
- Consider upgrading to Team plan ($20/month)
- Add monitoring and alerts

## Troubleshooting

### Build Fails:
- Check that `backend/` folder structure is correct
- Verify `package.json` has all dependencies
- Check Railway build logs

### Database Connection Issues:
- Ensure `DATABASE_URL` is set correctly
- Check PostgreSQL service is running in Railway
- Verify `prisma/schema.prisma` connection string format

### API Not Responding:
- Check deployment logs for errors
- Verify `PORT` environment variable
- Test with Railway-provided domain first

## Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Use strong SSH key for VPN server
- [ ] Enable Railway's built-in SSL (automatic)
- [ ] Set CORS_ORIGIN to specific domains in production
- [ ] Rotate SSH keys regularly
- [ ] Enable Railway's 2FA for your account
- [ ] Set up monitoring alerts

## Next Steps

1. ✅ Backend deployed to Railway
2. ⏭️ Update desktop app configuration
3. ⏭️ Test production VPN connections
4. ⏭️ Set up custom domain (optional)
5. ⏭️ Deploy web demo to Vercel/Netlify
6. ⏭️ Set up monitoring (Sentry, LogRocket)

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- CVault Issues: [Your GitHub Issues]
