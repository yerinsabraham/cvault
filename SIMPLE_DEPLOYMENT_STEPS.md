# CVault Deployment - Simple Steps

## Current Situation
✅ Your SSH key is already set up  
✅ You can access the DigitalOcean server  
✅ Backend code is ready  
✅ Desktop app is updated for production  

## What You Need to Do

### Step 1: Configure DNS on Namecheap (5 minutes)

**Go to Namecheap:**
1. Login: https://www.namecheap.com
2. Click "Domain List" → Manage `creovine.com`
3. Click "Advanced DNS" tab
4. Click "Add New Record" and add this:

```
Type: A Record
Host: api
Value: 165.22.138.31
TTL: Automatic
```

5. Click the green checkmark to save
6. Wait 10-15 minutes for DNS to update

**Check if DNS is ready:**
```bash
nslookup api.creovine.com
# Should show: 165.22.138.31
```

---

### Step 2: Deploy Backend to DigitalOcean (10 minutes)

**Option A: Let me deploy it for you (Easiest)**

I can run the deployment commands for you right now. Just say "deploy it" and I'll:
- Upload the backend code to your server
- Install all dependencies
- Setup the database
- Configure Nginx and SSL
- Start everything

**Option B: Do it yourself**

```bash
# 1. Upload backend code to server
cd /Users/apple/creovine_main/cvault
scp -i ~/.ssh/cvault_vpn_server -r backend root@165.22.138.31:/opt/cvault-backend

# 2. SSH to server and run deployment script
ssh -i ~/.ssh/cvault_vpn_server root@165.22.138.31
cd /opt/cvault-backend
chmod +x deploy-digitalocean.sh
./deploy-digitalocean.sh

# Script will ask: "Continue with SSL setup? (y/n)"
# Type: y (if DNS is ready)

# Done! Backend is deployed.
```

---

### Step 3: Update VPN Key (2 minutes)

After deployment, you need to tell the backend the VPN server's public key:

```bash
# SSH to server
ssh -i ~/.ssh/cvault_vpn_server root@165.22.138.31

# Get the WireGuard public key
sudo cat /etc/wireguard/publickey

# Copy that key (Ctrl+C or Cmd+C)

# Edit the backend config
nano /opt/cvault-backend/.env
# Find line: VPN_SERVER_PUBLIC_KEY=change_me_to_actual_public_key
# Replace with the key you copied
# Press Ctrl+X, then Y, then Enter to save

# Restart backend
systemctl restart cvault-backend
```

---

### Step 4: Test It Works (2 minutes)

```bash
# Test the API
curl https://api.creovine.com/health
# Should return: {"status":"ok"}

# If that works, you're done with backend!
```

---

### Step 5: Build Desktop App (5 minutes)

```bash
cd /Users/apple/creovine_main/cvault/desktop-client

# Build production version
flutter build macos --release --dart-define=PRODUCTION=true

# Test it
open "build/macos/Build/Products/Release/CVault Desktop.app"
# Login with: test@example.com / SecurePass123!
# Connect to VPN - it should connect to the production API
```

---

### Step 6: Create Installer (Optional)

```bash
# Install tool to create .dmg installer
brew install create-dmg

# Create installer
cd /Users/apple/creovine_main/cvault/desktop-client
create-dmg \
  --volname "CVault Installer" \
  --window-pos 200 120 \
  --window-size 800 400 \
  --icon-size 100 \
  --app-drop-link 600 185 \
  "CVault-Installer.dmg" \
  "build/macos/Build/Products/Release/CVault Desktop.app"

# Now you have: CVault-Installer.dmg
# Users can download and install this!
```

---

## Summary

**What happens:**
1. DNS points `api.creovine.com` to your DigitalOcean server
2. Backend runs on the server with Nginx handling HTTPS
3. Desktop app connects to `https://api.creovine.com/cvault/v1`
4. Users download the .dmg file and install CVault on their Mac

**Total time:** ~30 minutes  
**Cost:** $12/month (DigitalOcean)

## Need Help?

**DNS not working?**
- Wait 15-30 minutes after adding the record
- Check with: `nslookup api.creovine.com`

**Backend not starting?**
- Check logs: `ssh -i ~/.ssh/cvault_vpn_server root@165.22.138.31 "journalctl -u cvault-backend -n 50"`

**App not connecting?**
- Make sure you built with: `--dart-define=PRODUCTION=true`
- Check API is working: `curl https://api.creovine.com/health`

---

## Quick Deploy (For Me to Run)

If you want me to handle the deployment, I can run these commands:

1. Upload backend code to server
2. Run deployment script
3. Configure VPN key
4. Test endpoints
5. Build desktop app

Just say **"deploy it"** and I'll do everything!
