# Phase 1 Setup Guide - Manual Steps

This guide walks you through every manual step needed to set up CVault infrastructure. Complete these in order, saving all credentials as you go.

---

## SETUP CHECKLIST

- [ ] AWS Account created
- [ ] AWS Access Keys obtained
- [ ] VPS Provider account created
- [ ] WireGuard VPS created
- [ ] GitHub account ready
- [ ] Domain purchased (optional for MVP)
- [ ] All credentials saved securely

---

## STEP 1: AWS ACCOUNT SETUP

### 1.1 Create AWS Account

**Website:** https://aws.amazon.com

1. Click **"Create an AWS Account"**
2. Enter your email address
3. Choose account name: `cvault-production` (or similar)
4. Enter contact information
5. Add payment method (credit/debit card)
   - **Note:** AWS offers free tier for 12 months
   - Most Phase 1 services fit within free tier
6. Verify identity (phone verification)
7. Choose **Basic Support Plan** (free)
8. Complete sign up

**Save these credentials:**
```
AWS Root Account Email: [your_email]
AWS Root Account Password: [your_password]
AWS Account ID: [will appear after signup]
```

⚠️ **Security:** Enable 2FA immediately after signup!

### 1.2 Enable 2FA on AWS Root Account

1. Sign in to AWS Console: https://console.aws.amazon.com
2. Click your account name (top right) → **Security credentials**
3. Under "Multi-factor authentication (MFA)", click **Assign MFA device**
4. Choose **Authenticator app** (use Google Authenticator or Authy)
5. Scan QR code with your phone
6. Enter two consecutive MFA codes
7. Click **Assign MFA**

✅ Your root account is now protected

### 1.3 Create IAM Admin User (Best Practice)

**Don't use root account for daily tasks!**

1. In AWS Console, search for **IAM** (Identity and Access Management)
2. Click **Users** (left sidebar) → **Add users**
3. Username: `cvault-admin`
4. Select **"Provide user access to the AWS Management Console"**
5. Choose **"I want to create an IAM user"**
6. Custom password: Create a strong password
7. Uncheck **"User must create a new password"** (you'll manage it)
8. Click **Next**
9. Select **"Attach policies directly"**
10. Search and select: **AdministratorAccess**
11. Click **Next** → **Create user**

**Important:** On the success page, click **"Download .csv file"**

**Save these credentials:**
```
IAM Username: cvault-admin
IAM Password: [from CSV file]
Console Sign-in URL: https://[account-id].signin.aws.amazon.com/console
```

### 1.4 Create Programmatic Access Keys (for CLI)

1. Still in IAM, go to **Users** → click **cvault-admin**
2. Click **"Security credentials"** tab
3. Scroll to **"Access keys"** section
4. Click **"Create access key"**
5. Select use case: **"Command Line Interface (CLI)"**
6. Check the confirmation box
7. Click **Next** → Add description: `CVault CLI Access`
8. Click **Create access key**
9. **IMPORTANT:** Click **"Download .csv file"** immediately
   - You can't retrieve the secret key again!

**Save these credentials:**
```
AWS Access Key ID: AKIA...
AWS Secret Access Key: [long secret string]
```

✅ Keep this CSV file secure - you'll need it for terminal setup

### 1.5 Select AWS Region

For Phase 1, choose ONE region and stick with it:

**Recommended options:**
- **us-east-1** (N. Virginia) - Cheapest, most services, good for US users
- **us-west-2** (Oregon) - Good for West Coast/Asia
- **eu-west-1** (Ireland) - Good for Europe

**Note your choice:**
```
AWS Region: us-east-1
```

All resources will be created in this region.

---

## STEP 2: VPS PROVIDER SETUP (for WireGuard)

You need a separate VPS for the WireGuard VPN server. AWS EC2 bandwidth is expensive for VPN traffic, so we use a cheaper VPS provider.

### 2.1 Choose a VPS Provider

**Recommended options:**

| Provider | 2GB RAM Cost | Pros |
|----------|-------------|------|
| **DigitalOcean** | $12/mo | Easy, good docs, reliable |
| **Vultr** | $12/mo | Fast deployment, many locations |
| **Hetzner** | €4.51/mo (~$5) | CHEAPEST, great for Europe |
| **Linode** | $12/mo | Good performance |

**I recommend DigitalOcean for beginners** - easiest interface.

### 2.2 Sign Up for DigitalOcean

**Website:** https://www.digitalocean.com

1. Click **"Sign Up"**
2. Sign up with email or GitHub
3. Verify email address
4. Add payment method
   - **Note:** You can use promo code for free credits
   - Search "DigitalOcean promo code 2026" for current offers
5. Complete account setup

**Save these credentials:**
```
DigitalOcean Email: [your_email]
DigitalOcean Password: [your_password]
```

### 2.3 Create SSH Key Pair (You'll need this!)

**Do this on your Mac terminal:**

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "cvault-vpn-server"

# When prompted for file location, use:
# /Users/apple/.ssh/cvault_vpn_server

# When prompted for passphrase, you can:
# - Leave empty (less secure but easier)
# - Or create a passphrase (more secure)
```

**You'll see:**
```
Your identification has been saved in /Users/apple/.ssh/cvault_vpn_server
Your public key has been saved in /Users/apple/.ssh/cvault_vpn_server.pub
```

**Display your public key:**
```bash
cat ~/.ssh/cvault_vpn_server.pub
```

**Copy the entire output** - you'll need this in next step!

**Save this info:**
```
SSH Private Key Location: /Users/apple/.ssh/cvault_vpn_server
SSH Public Key Location: /Users/apple/.ssh/cvault_vpn_server.pub
SSH Passphrase (if set): [your_passphrase]
```

### 2.4 Create WireGuard VPS Droplet

1. In DigitalOcean dashboard, click **"Create"** → **"Droplets"**

2. **Choose Region:**
   - Select closest to your target users
   - Example: New York, San Francisco, London, etc.
   - **Save your choice:** `[Region: New York 1]`

3. **Choose Image:**
   - Select **Ubuntu 22.04 LTS x64**

4. **Choose Size:**
   - Click **"Regular"** plan
   - Select **$12/mo** option (2 GB RAM / 1 vCPU / 50 GB SSD / 2 TB transfer)

5. **Choose Authentication:**
   - Select **"SSH keys"**
   - Click **"New SSH Key"**
   - Paste your SSH public key (from step 2.3)
   - Name it: `cvault-vpn-server-key`
   - Click **"Add SSH Key"**

6. **Finalize Details:**
   - Hostname: `cvault-vpn-server`
   - Tags: `production`, `vpn`, `wireguard`
   - Project: Create new → `CVault`

7. Click **"Create Droplet"**

8. **Wait ~60 seconds for droplet to be created**

9. **When ready, copy the IP address shown**

**Save these details:**
```
VPS Provider: DigitalOcean
VPS IP Address: [xxx.xxx.xxx.xxx]
VPS Region: [New York 1]
VPS Size: 2GB RAM
Root Username: root
SSH Key: cvault_vpn_server
```

### 2.5 Test SSH Connection

In your Mac terminal:

```bash
# Test connection to your VPS
ssh -i ~/.ssh/cvault_vpn_server root@[YOUR_VPS_IP]

# If it asks "Are you sure you want to continue connecting?", type: yes
```

**If successful, you'll see:**
```
Welcome to Ubuntu 22.04.x LTS
root@cvault-vpn-server:~#
```

**Type `exit` to disconnect for now.**

✅ Your VPS is ready!

---

## STEP 3: GITHUB ACCOUNT & REPOSITORY

### 3.1 Ensure GitHub Account Exists

**Website:** https://github.com

If you don't have an account:
1. Sign up with email
2. Verify email
3. Choose free plan

**Save these credentials:**
```
GitHub Username: [your_username]
GitHub Email: [your_email]
GitHub Password: [your_password]
```

### 3.2 Create Personal Access Token (for Git operations)

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Note: `CVault Development`
4. Expiration: **90 days** (you can regenerate later)
5. Select scopes:
   - [x] **repo** (all)
   - [x] **workflow**
   - [x] **write:packages**
6. Click **"Generate token"**
7. **COPY THE TOKEN IMMEDIATELY** - you can't see it again!

**Save this credential:**
```
GitHub Personal Access Token: ghp_xxxxxxxxxxxxxxxxxxxx
```

---

## STEP 4: DOMAIN SETUP (Optional for MVP)

You can skip this initially and use IP addresses, but for a professional demo you'll want a domain.

### 4.1 Purchase Domain

**Recommended registrars:**
- **Namecheap** - https://www.namecheap.com (~$10-15/year)
- **Google Domains** - https://domains.google
- **Cloudflare** - https://www.cloudflare.com/products/registrar/ (at-cost pricing)

**Suggested domains:**
- `cvault.io` (if available)
- `cvault-vpn.com`
- `yourcustomname-vpn.com`

**After purchase, save:**
```
Domain Name: [your_domain.com]
Registrar: [Namecheap]
Registrar Login: [email/password]
```

### 4.2 Point Domain to AWS (We'll do this later)

For now, just have the domain ready. We'll configure DNS records in Phase 7.

---

## STEP 5: ORGANIZE YOUR CREDENTIALS

Create a secure file to store all credentials:

### 5.1 Create Credentials File (Encrypted)

On your Mac:

```bash
# Create a secure notes file
nano ~/Documents/cvault_credentials.txt
```

**Paste this template and fill it in:**

```
===========================================
CVAULT INFRASTRUCTURE CREDENTIALS
Created: [Today's Date]
===========================================

AWS CREDENTIALS
---------------
Account ID: 
Root Email: 
Root Password: 
Root 2FA Device: [Google Authenticator on iPhone]

IAM Admin User:
  Username: cvault-admin
  Password: 
  Console URL: https://[account-id].signin.aws.amazon.com/console

AWS Access Keys (CLI):
  Access Key ID: AKIA...
  Secret Access Key: 
  Region: us-east-1

VPS CREDENTIALS (DigitalOcean)
--------------------------------
Account Email: 
Account Password: 
VPS IP Address: 
VPS Region: 
SSH Key Location: /Users/apple/.ssh/cvault_vpn_server

GITHUB CREDENTIALS
------------------
Username: 
Email: 
Password: 
Personal Access Token: ghp_...

DOMAIN (Optional)
-----------------
Domain Name: 
Registrar: 
Login: 

FUTURE CREDENTIALS (Save as you create)
----------------------------------------
PostgreSQL Password: (create in Phase 3)
JWT Secret: (generate in Phase 3)
API Encryption Key: (generate in Phase 3)
Stripe Keys: (add later if needed)

===========================================
⚠️  KEEP THIS FILE SECURE - DO NOT SHARE
===========================================
```

**Save and encrypt:**

```bash
# Save the file (Ctrl+O, Enter, Ctrl+X)

# Encrypt it (optional but recommended)
# You'll need to install GPG first:
brew install gnupg

# Encrypt the file
gpg -c ~/Documents/cvault_credentials.txt

# This creates cvault_credentials.txt.gpg
# You can delete the unencrypted version:
rm ~/Documents/cvault_credentials.txt

# To decrypt later:
# gpg ~/Documents/cvault_credentials.txt.gpg
```

---

## STEP 6: INSTALL REQUIRED TOOLS ON YOUR MAC

### 6.1 Install Homebrew (if not already installed)

```bash
# Check if Homebrew is installed
which brew

# If not found, install it:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 6.2 Install AWS CLI

```bash
# Install AWS CLI
brew install awscli

# Verify installation
aws --version
# Should show: aws-cli/2.x.x ...
```

### 6.3 Configure AWS CLI

```bash
aws configure

# When prompted, enter:
AWS Access Key ID: [from Step 1.4]
AWS Secret Access Key: [from Step 1.4]
Default region name: us-east-1 (or your chosen region)
Default output format: json
```

**Test it works:**
```bash
aws sts get-caller-identity
```

**Should return:**
```json
{
    "UserId": "AIDA...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/cvault-admin"
}
```

✅ AWS CLI is configured!

### 6.4 Install Other Essential Tools

```bash
# Install Git (if not already installed)
brew install git

# Install Node.js (for backend development)
brew install node@20

# Install Docker Desktop
brew install --cask docker

# Install Visual Studio Code (if not installed)
brew install --cask visual-studio-code

# Install WireGuard (for testing VPN)
brew install wireguard-tools
```

### 6.5 Verify All Installations

```bash
# Check versions
git --version
node --version
npm --version
docker --version
wg --version
code --version
```

All commands should return version numbers without errors.

---

## STEP 7: SET UP YOUR WORKSPACE

### 7.1 Create Project Directory

```bash
# Navigate to your projects folder
cd /Users/apple/creovine_main/cvault

# Verify you're in the right place
pwd
# Should show: /Users/apple/creovine_main/cvault

# List current files
ls -la
# Should show: cvault_document.md and this guide
```

### 7.2 Initialize Git Repository (if not already done)

```bash
# Initialize git
git init

# Set your identity
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Create .gitignore
cat > .gitignore << 'EOF'
# Environment files
.env
.env.*
*.env

# Credentials
*credentials*
*secrets*
*.pem
*.key
*.crt

# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
*.log

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Database
*.db
*.sqlite

# Terraform
*.tfstate
*.tfstate.backup
.terraform/
EOF

# Create initial commit
git add .
git commit -m "Initial commit: CVault platform documentation"
```

---

## COMPLETION CHECKLIST

Before moving to the next phase, verify you have:

### AWS
- [x] AWS account created and verified
- [x] 2FA enabled on root account
- [x] IAM admin user created
- [x] AWS CLI installed and configured
- [x] Can run `aws sts get-caller-identity` successfully

### VPS
- [x] DigitalOcean (or other VPS) account created
- [x] SSH key pair generated
- [x] VPS droplet created with Ubuntu 22.04
- [x] Can SSH into VPS: `ssh -i ~/.ssh/cvault_vpn_server root@[VPS_IP]`
- [x] VPS IP address saved

### Development Environment
- [x] GitHub account ready
- [x] Personal access token created
- [x] Homebrew installed
- [x] Node.js installed (v20+)
- [x] Docker installed
- [x] WireGuard tools installed
- [x] VS Code installed
- [x] Project directory created at `/Users/apple/creovine_main/cvault`
- [x] Git initialized

### Security
- [x] All credentials saved securely
- [x] Credentials file encrypted (optional)
- [x] SSH keys backed up
- [x] .gitignore configured to exclude secrets

---

## WHAT'S NEXT?

Once you've completed all the above steps, you're ready for:

**PHASE 1 - PART 2: Server Configuration**

We'll work together in the terminal to:
1. Configure AWS EC2 instance for backend
2. Set up RDS PostgreSQL database
3. Configure WireGuard VPS
4. Install required software on both servers
5. Set up security groups and firewall rules

**Estimated time:** 1-2 hours

---

## NEED HELP?

Common issues:

**AWS CLI not working:**
```bash
# Re-configure
aws configure
# Make sure you're using the correct access keys
```

**Can't SSH to VPS:**
```bash
# Check SSH key permissions
chmod 600 ~/.ssh/cvault_vpn_server

# Try with verbose mode to see errors
ssh -v -i ~/.ssh/cvault_vpn_server root@[VPS_IP]
```

**Docker not starting:**
```bash
# Open Docker Desktop application manually
open -a Docker

# Wait for it to start, then try:
docker ps
```

---

**When you've completed everything above, let me know and we'll move to server configuration!** 🚀
