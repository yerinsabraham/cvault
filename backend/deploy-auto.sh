#!/bin/bash
# Non-interactive CVault deployment script
set -e

echo "Starting CVault Backend Deployment..."

# Check and install Node.js
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Check and install Nginx
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get update
    apt-get install -y nginx certbot python3-certbot-nginx
fi

# Create .env file
cat > /opt/cvault-backend/.env << 'EOF'
NODE_ENV=production
PORT=3000
JWT_SECRET=Cf03jinxEGHOhR2jW6xYFl2mu1UvHo3iJnHZtpZuyyI=
JWT_EXPIRES_IN=7d
DATABASE_URL=postgresql://cvault:cvault_secure_pass_2024@localhost:5432/cvault_db
REDIS_HOST=localhost
REDIS_PORT=6379
VPN_SERVER_HOST=165.22.138.31
VPN_SERVER_PORT=51820
VPN_SERVER_PUBLIC_KEY=change_me_to_actual_public_key
SSH_HOST=165.22.138.31
SSH_PORT=22
SSH_USER=root
SSH_KEY_PATH=/root/.ssh/id_rsa
ENABLE_METRICS=true
LOG_LEVEL=info
CORS_ORIGIN=https://cvault.creovine.com,https://creovine.com
EOF

# Install npm dependencies
cd /opt/cvault-backend
npm install --production

# Start Docker containers
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
fi

# Wait for database
sleep 10

# Create systemd service
cat > /etc/systemd/system/cvault-backend.service << 'EOF'
[Unit]
Description=CVault Backend API Server
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/cvault-backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cvault-backend
systemctl start cvault-backend

# Configure Nginx
cat > /etc/nginx/sites-available/cvault << 'EOF'
server {
    listen 80;
    server_name api.creovine.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/cvault /etc/nginx/sites-enabled/cvault
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "Deployment complete! Backend running on port 3000"
echo "Run: certbot --nginx -d api.creovine.com --non-interactive --agree-tos -m admin@creovine.com"
