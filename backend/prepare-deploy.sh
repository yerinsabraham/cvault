#!/bin/bash

echo "🚀 CVault Production Deployment Helper"
echo "========================================="
echo ""

# Generate JWT Secret
echo "📝 Generating JWT Secret..."
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$JWT_SECRET"
echo ""

# Check VPN Server Connection
echo "🔍 Checking VPN Server Connection..."
if nc -z -w5 165.22.138.31 22 2>/dev/null; then
    echo "✅ VPN Server (165.22.138.31:22) is reachable"
else
    echo "⚠️  Cannot reach VPN Server (165.22.138.31:22)"
    echo "   Make sure your VPN server is running and accessible"
fi
echo ""

# Check if SSH key exists
echo "🔑 Checking SSH Keys..."
if [ -f ~/.ssh/id_rsa ]; then
    echo "✅ SSH key found at ~/.ssh/id_rsa"
    echo ""
    echo "📋 Copy this SSH private key to Railway VPN_SERVER_PRIVATE_KEY variable:"
    echo "----------------------------------------"
    cat ~/.ssh/id_rsa
    echo "----------------------------------------"
elif [ -f ~/.ssh/id_ed25519 ]; then
    echo "✅ SSH key found at ~/.ssh/id_ed25519"
    echo ""
    echo "📋 Copy this SSH private key to Railway VPN_SERVER_PRIVATE_KEY variable:"
    echo "----------------------------------------"
    cat ~/.ssh/id_ed25519
    echo "----------------------------------------"
else
    echo "⚠️  No SSH key found"
    echo "   Generate one with: ssh-keygen -t ed25519 -C 'cvault-railway'"
fi
echo ""

# Railway CLI check
echo "🚂 Checking Railway CLI..."
if command -v railway &> /dev/null; then
    echo "✅ Railway CLI is installed"
    echo "   Version: $(railway --version)"
else
    echo "⚠️  Railway CLI not installed"
    echo "   Install with: npm i -g @railway/cli"
    echo "   Or use the web interface at https://railway.app"
fi
echo ""

echo "✅ Pre-deployment checks complete!"
echo ""
echo "📖 Next Steps:"
echo "1. Go to https://railway.app and create a new project"
echo "2. Add PostgreSQL and Redis databases"
echo "3. Deploy backend from GitHub"
echo "4. Add the environment variables shown above"
echo "5. Deploy and test!"
echo ""
echo "📚 Full guide: RAILWAY_DEPLOYMENT.md"
