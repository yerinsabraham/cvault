# CVault Production Deployment Guide - DigitalOcean

## Overview
This guide covers deploying CVault backend to DigitalOcean with the Creovine platform architecture.

**Architecture:**
- Domain: `api.creovine.com` (unified API endpoint for all Creovine products)
- CVault API: `api.creovine.com/cvault/v1/*`
- VPN Server: `165.22.138.31` (DigitalOcean Ubuntu droplet)
- Backend: Node.js/Fastify on port 3000
- Databases: PostgreSQL + Redis (Docker containers)
- Reverse Proxy: Nginx with SSL (Let's Encrypt)

## Prerequisites

1. **DigitalOcean Droplet** (Already configured)
   - IP: `165.22.138.31`
   - OS: Ubuntu 22.04
   - WireGuard running on port 51820

2. **Domain** (Already purchased)
   - Domain: `creovine.com` (Namecheap)
   - Need to configure DNS records (see below)

3. **SSH Access**
   - You need SSH access to the droplet
   - Check if you have SSH key: `ls ~/.ssh/`

## Step 1: Configure DNS on Namecheap

Log in to Namecheap → Domain List → Manage `creovine.com` → Advanced DNS

**Add these records:**

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | `api` | `165.22.138.31` | Automatic |
| A Record | `cvault` | `165.22.138.31` (or your hosting) | Automatic |
| CNAME Record | `download` | `api.creovine.com` | Automatic |

**What each subdomain is for:**
- `api.creovine.com` - Backend API for all products (cvault, future products)
- `cvault.creovine.com` - Product landing page (marketing, downloads)
- `download.creovine.com` - Direct app download links

**DNS Propagation:** Wait 5-30 minutes after adding records. Check with:
```bash
nslookup api.creovine.com
# Should return: 165.22.138.31
```

## Step 2: Prepare SSH Access

**Check if you have SSH key:**
```bash
ls ~/.ssh/
```

If no `id_rsa` or `id_ed25519` files, generate one:
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Press Enter for default location and passphrase
```

**Copy key to DigitalOcean:**
```bash
ssh-copy-id root@165.22.138.31
# Or manually via DigitalOcean console
```

**Test connection:**
```bash
ssh root@165.22.138.31
```

## Step 3: Upload Backend Code

**Option A: Using Git (Recommended)**
```bash
# On your local machine
cd /Users/apple/creovine_main/cvault/backend
git init
git add .
git commit -m "Initial commit"

# Push to GitHub/GitLab (create repository first)
git remote add origin your_repo_url
git push -u origin main

# On DigitalOcean server
mkdir -p /opt/cvault-backend
cd /opt/cvault-backend
git clone your_repo_url .
```

**Option B: Using SCP**
```bash
# From your local machine
cd /Users/apple/creovine_main/cvault
scp -r backend root@165.22.138.31:/opt/cvault-backend
```

## Step 4: Run Deployment Script

**On your DigitalOcean server:**
```bash
ssh root@165.22.138.31

# Navigate to backend directory
cd /opt/cvault-backend

# Make script executable
chmod +x deploy-digitalocean.sh

# Run deployment
sudo ./deploy-digitalocean.sh
```

**The script will:**
1. Install Node.js 20.x, Nginx, Docker
2. Create application directory (`/opt/cvault-backend`)
3. Install dependencies
4. Setup environment variables
5. Start PostgreSQL and Redis containers
6. Run database migrations
7. Create systemd service
8. Configure Nginx reverse proxy
9. Obtain SSL certificate (if DNS is ready)

## Step 5: Configure VPN Public Key

After deployment, you need to update the VPN server's public key:

```bash
# On DigitalOcean server
ssh root@165.22.138.31

# Get WireGuard public key
sudo cat /etc/wireguard/publickey

# Copy the output (something like: ABC123...XYZ=)

# Edit .env file
nano /opt/cvault-backend/.env

# Update this line:
VPN_SERVER_PUBLIC_KEY=paste_your_actual_key_here

# Restart backend
systemctl restart cvault-backend
```

## Step 6: Verify Deployment

**Check service status:**
```bash
systemctl status cvault-backend
```

**Check logs:**
```bash
journalctl -u cvault-backend -f
```

**Test endpoints:**
```bash
# Platform root
curl https://api.creovine.com/
# Expected: {"message":"Creovine API Platform","products":{"cvault":"/cvault/v1"}}

# Health check
curl https://api.creovine.com/health
# Expected: {"status":"ok"}

# CVault API
curl https://api.creovine.com/cvault/v1/health
```

**Check Docker containers:**
```bash
docker ps
# Should see: cvault-postgres and cvault-redis
```

**Check Nginx:**
```bash
nginx -t
systemctl status nginx
```

## Step 7: Build Desktop App for Production

**On your local machine:**

```bash
cd /Users/apple/creovine_main/cvault/desktop-client

# Build for production (uses production API URL)
flutter build macos --release --dart-define=PRODUCTION=true

# App will be at:
# build/macos/Build/Products/Release/CVault Desktop.app
```

**Test production build:**
```bash
open "build/macos/Build/Products/Release/CVault Desktop.app"
# Try logging in with: test@example.com / SecurePass123!
```

## Step 8: Create Installers

**macOS (.dmg):**
```bash
# Install create-dmg
brew install create-dmg

# Create DMG installer
create-dmg \
  --volname "CVault Installer" \
  --window-pos 200 120 \
  --window-size 800 400 \
  --icon-size 100 \
  --app-drop-link 600 185 \
  "CVault-Installer.dmg" \
  "build/macos/Build/Products/Release/CVault Desktop.app"
```

**Windows (.exe):**
```bash
# On Windows machine or VM
flutter build windows --release --dart-define=PRODUCTION=true

# Use Inno Setup or NSIS to create installer
# Installer script example in: windows-installer.iss (create this)
```

## Directory Structure After Deployment

```
/opt/cvault-backend/
├── src/                    # Backend source code
├── node_modules/           # Dependencies
├── .env                    # Production environment variables
├── package.json
└── deploy-digitalocean.sh

/etc/nginx/sites-enabled/cvault  # Nginx config
/etc/systemd/system/cvault-backend.service  # Systemd service
/var/log/nginx/cvault-*.log      # Nginx logs
```

## Environment Variables

The deployment script creates `.env` with these defaults:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=Cf03jinxEGHOhR2jW6xYFl2mu1UvHo3iJnHZtpZuyyI=
DATABASE_URL=postgresql://cvault:cvault_secure_pass_2024@localhost:5432/cvault_db
REDIS_HOST=localhost
REDIS_PORT=6379
VPN_SERVER_HOST=165.22.138.31
VPN_SERVER_PORT=51820
VPN_SERVER_PUBLIC_KEY=change_me_to_actual_public_key
```

**⚠️ Important:** Update `VPN_SERVER_PUBLIC_KEY` after deployment!

## Useful Commands

**Service Management:**
```bash
sudo systemctl status cvault-backend   # Check status
sudo systemctl restart cvault-backend  # Restart
sudo systemctl stop cvault-backend     # Stop
sudo journalctl -u cvault-backend -f   # View logs (follow)
```

**Docker Management:**
```bash
docker ps                              # List containers
docker logs cvault-postgres            # PostgreSQL logs
docker logs cvault-redis               # Redis logs
docker exec -it cvault-postgres psql -U cvault -d cvault_db  # Database shell
```

**Nginx:**
```bash
sudo nginx -t                          # Test config
sudo systemctl reload nginx            # Reload config
sudo tail -f /var/log/nginx/cvault-access.log
```

**SSL Certificate Renewal:**
```bash
sudo certbot renew                     # Manual renewal
sudo systemctl status certbot.timer    # Auto-renewal status
```

**Update Backend Code:**
```bash
cd /opt/cvault-backend
git pull                               # Get latest code
npm install                            # Update dependencies
sudo systemctl restart cvault-backend  # Restart service
```

## Costs

**DigitalOcean Pricing:**
- Basic Droplet (1GB RAM): $6/month
- Recommended (2GB RAM): $12/month
- Storage: Included (25-50GB)
- Bandwidth: 1-2TB included

**Total:** $12/month for everything (VPN + Backend + DB)

## Security Checklist

- [ ] SSH key-based authentication (disable password)
- [ ] Firewall configured (ufw or DigitalOcean firewall)
- [ ] SSL certificate installed and auto-renewing
- [ ] Database passwords changed from defaults
- [ ] JWT_SECRET is strong and unique
- [ ] Regular backups configured
- [ ] Monitoring/alerting setup

## Troubleshooting

**Backend not starting:**
```bash
journalctl -u cvault-backend -n 50
# Check for errors in database connection, dependencies, etc.
```

**Nginx 502 Bad Gateway:**
```bash
# Check if backend is running
systemctl status cvault-backend

# Check backend logs
journalctl -u cvault-backend -f
```

**SSL certificate issues:**
```bash
# Remove and reinstall
sudo certbot delete --cert-name api.creovine.com
sudo certbot --nginx -d api.creovine.com
```

**Database connection failed:**
```bash
# Check PostgreSQL container
docker ps | grep postgres
docker logs cvault-postgres

# Test connection
psql postgresql://cvault:cvault_secure_pass_2024@localhost:5432/cvault_db
```

## Next Steps

1. **Add More VPN Locations:**
   - Create droplets in USA, UK, Germany
   - Update backend with location selection
   - Add UI for location switching

2. **Build Mobile Apps:**
   - Android: `flutter build apk --release --dart-define=PRODUCTION=true`
   - iOS: `flutter build ios --release --dart-define=PRODUCTION=true`

3. **Create Landing Page:**
   - Deploy to `cvault.creovine.com`
   - Add download buttons
   - Feature descriptions

4. **Monitoring:**
   - Setup Uptime Robot or similar
   - Configure error alerting
   - Add analytics

5. **Subscriptions:**
   - Integrate payment system (Stripe)
   - Add subscription tiers
   - Usage limits

## Support

If you encounter issues:
1. Check logs: `journalctl -u cvault-backend -f`
2. Verify DNS: `nslookup api.creovine.com`
3. Test endpoints: `curl https://api.creovine.com/health`
4. Review Nginx logs: `/var/log/nginx/cvault-error.log`
