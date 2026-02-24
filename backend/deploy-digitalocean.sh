#!/bin/bash
# CVault Backend Deployment Script for DigitalOcean
# Run this on your DigitalOcean droplet (165.22.138.31)

set -e

echo "🚀 CVault Backend Deployment Script"
echo "===================================="

# Configuration
APP_DIR="/opt/cvault-backend"
NGINX_SITES="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
SYSTEMD_DIR="/etc/systemd/system"
DOMAIN="api.creovine.com"
VPN_SERVER_IP="165.22.138.31"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo_success() { echo -e "${GREEN}✓${NC} $1"; }
echo_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
echo_error() { echo -e "${RED}✗${NC} $1"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo_error "Please run as root (use sudo)"
    exit 1
fi

echo ""
echo "Step 1: Installing system dependencies..."
apt-get update
apt-get install -y curl git nginx certbot python3-certbot-nginx

echo_success "System dependencies installed"

echo ""
echo "Step 2: Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo_success "Node.js $(node --version) installed"

echo ""
echo "Step 3: Installing Docker (if not present)..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
fi
echo_success "Docker installed"

echo ""
echo "Step 4: Creating application directory..."
mkdir -p $APP_DIR
cd $APP_DIR
echo_success "App directory: $APP_DIR"

echo ""
echo "Step 5: Cloning/updating repository..."
if [ -d "$APP_DIR/.git" ]; then
    echo_warning "Repository exists, pulling latest changes..."
    git pull
else
    echo "Please enter your repository URL (or press Enter to skip):"
    read -r REPO_URL
    if [ -n "$REPO_URL" ]; then
        git clone $REPO_URL .
    else
        echo_warning "Skipped git clone - please manually copy files to $APP_DIR"
    fi
fi

echo ""
echo "Step 6: Installing Node.js dependencies..."
if [ -f "package.json" ]; then
    npm install --production
    echo_success "Dependencies installed"
else
    echo_warning "No package.json found - skipping npm install"
fi

echo ""
echo "Step 7: Setting up environment variables..."
cat > $APP_DIR/.env << EOF
# CVault Backend Production Environment
NODE_ENV=production
PORT=3000

# JWT Configuration
JWT_SECRET=Cf03jinxEGHOhR2jW6xYFl2mu1UvHo3iJnHZtpZuyyI=
JWT_EXPIRES_IN=7d

# Database Configuration
DATABASE_URL=postgresql://cvault:cvault_secure_pass_2024@localhost:5432/cvault_db

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# VPN Server Configuration
VPN_SERVER_HOST=$VPN_SERVER_IP
VPN_SERVER_PORT=51820
VPN_SERVER_PUBLIC_KEY=change_me_to_actual_public_key

# SSH Configuration (for device management)
SSH_HOST=$VPN_SERVER_IP
SSH_PORT=22
SSH_USER=root
SSH_KEY_PATH=/root/.ssh/id_rsa

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=info

# CORS (adjust as needed)
CORS_ORIGIN=https://cvault.creovine.com,https://creovine.com
EOF

echo_success ".env file created"
echo_warning "⚠️  Please update VPN_SERVER_PUBLIC_KEY in $APP_DIR/.env"

echo ""
echo "Step 8: Starting PostgreSQL and Redis with Docker..."
docker network create cvault-network 2>/dev/null || true

# PostgreSQL
if ! docker ps | grep -q cvault-postgres; then
    docker run -d \
        --name cvault-postgres \
        --network cvault-network \
        -e POSTGRES_DB=cvault_db \
        -e POSTGRES_USER=cvault \
        -e POSTGRES_PASSWORD=cvault_secure_pass_2024 \
        -p 5432:5432 \
        -v cvault-postgres-data:/var/lib/postgresql/data \
        --restart unless-stopped \
        postgres:16-alpine
    echo_success "PostgreSQL started"
else
    echo_warning "PostgreSQL container already running"
fi

# Redis
if ! docker ps | grep -q cvault-redis; then
    docker run -d \
        --name cvault-redis \
        --network cvault-network \
        -p 6379:6379 \
        -v cvault-redis-data:/data \
        --restart unless-stopped \
        redis:7-alpine redis-server --appendonly yes
    echo_success "Redis started"
else
    echo_warning "Redis container already running"
fi

echo ""
echo "Step 9: Running database migrations..."
sleep 5 # Wait for PostgreSQL to be ready
if [ -f "package.json" ] && grep -q "migrate" package.json; then
    npm run migrate 2>/dev/null || echo_warning "No migrate script found"
fi

echo ""
echo "Step 10: Creating systemd service..."
cat > $SYSTEMD_DIR/cvault-backend.service << EOF
[Unit]
Description=CVault Backend API Server
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cvault-backend

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cvault-backend
systemctl start cvault-backend
echo_success "Systemd service created and started"

echo ""
echo "Step 11: Configuring Nginx..."
cat > $NGINX_SITES/cvault << 'EOF'
# CVault Backend - api.creovine.com
server {
    listen 80;
    server_name api.creovine.com;
    
    # Redirect HTTP to HTTPS (will be configured by certbot)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.creovine.com;
    
    # SSL certificates (will be configured by certbot)
    # ssl_certificate /etc/letsencrypt/live/api.creovine.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/api.creovine.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Logging
    access_log /var/log/nginx/cvault-access.log;
    error_log /var/log/nginx/cvault-error.log;
    
    # Root endpoint (platform info)
    location = / {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }
    
    # CVault API
    location /cvault/ {
        proxy_pass http://localhost:3000/cvault/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Future product endpoints (add as needed)
    # location /product2/ {
    #     proxy_pass http://localhost:4000/product2/;
    # }
}
EOF

ln -sf $NGINX_SITES/cvault $NGINX_ENABLED/cvault
nginx -t && systemctl reload nginx
echo_success "Nginx configured"

echo ""
echo "Step 12: Obtaining SSL certificate..."
echo_warning "Make sure DNS is configured before proceeding!"
echo "Continue with SSL setup? (y/n)"
read -r SSL_CONFIRM

if [ "$SSL_CONFIRM" = "y" ]; then
    certbot --nginx -d api.creovine.com --non-interactive --agree-tos --email admin@creovine.com || {
        echo_warning "SSL setup failed - you can run this manually later:"
        echo "  sudo certbot --nginx -d api.creovine.com"
    }
else
    echo_warning "Skipped SSL setup - run manually later:"
    echo "  sudo certbot --nginx -d api.creovine.com"
fi

echo ""
echo "============================================"
echo_success "🎉 Deployment Complete!"
echo "============================================"
echo ""
echo "Service Status:"
systemctl status cvault-backend --no-pager -l || true
echo ""
echo "Useful Commands:"
echo "  • Check logs:        journalctl -u cvault-backend -f"
echo "  • Restart service:   systemctl restart cvault-backend"
echo "  • Check Nginx:       nginx -t"
echo "  • View containers:   docker ps"
echo ""
echo "Next Steps:"
echo "  1. Configure DNS: api.creovine.com → $VPN_SERVER_IP"
echo "  2. Update VPN_SERVER_PUBLIC_KEY in $APP_DIR/.env"
echo "  3. Test API: curl https://api.creovine.com/health"
echo "  4. Check logs to verify everything is working"
echo ""
echo_warning "Don't forget to configure your SSH key for VPN management!"
