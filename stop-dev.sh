#!/bin/bash
# CVault Development Servers Stop Script

echo "🛑 Stopping CVault Development Environment..."

# Kill backend
BACKEND_PID=$(lsof -ti :3000)
if [ -n "$BACKEND_PID" ]; then
    kill -9 $BACKEND_PID 2>/dev/null
    echo "✅ Backend API stopped"
else
    echo "⚠️  Backend API not running"
fi

# Kill web demo
FRONTEND_PID=$(lsof -ti :5173)
if [ -n "$FRONTEND_PID" ]; then
    kill -9 $FRONTEND_PID 2>/dev/null
    echo "✅ Web Demo stopped"
else
    echo "⚠️  Web Demo not running"
fi

# Stop Docker containers
cd "$(dirname "$0")/backend" || exit 1
docker compose down
echo "✅ Database containers stopped"

echo ""
echo "✨ All CVault services stopped"
