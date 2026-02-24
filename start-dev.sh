#!/bin/bash
# CVault Development Servers Startup Script

echo "🚀 Starting CVault Development Environment..."
echo ""

# Check if Docker is running
if ! docker ps >/dev/null 2>&1; then
    echo "⚠️  Docker is not running. Starting Docker Desktop..."
    open -a Docker
    echo "⏳ Waiting for Docker to start..."
    for i in {1..30}; do
        if docker ps >/dev/null 2>&1; then
            echo "✅ Docker is ready!"
            break
        fi
        sleep 2
    done
fi

# Start database containers
echo ""
echo "🐘 Starting PostgreSQL and Redis..."
cd "$(dirname "$0")/backend" || exit 1
docker compose up -d postgres redis

# Wait for databases to be healthy
echo "⏳ Waiting for databases to be ready..."
sleep 3

# Check database health
if docker ps | grep cvault-postgres | grep -q "healthy"; then
    echo "✅ PostgreSQL is ready (port 5433)"
else
    echo "❌ PostgreSQL failed to start"
    exit 1
fi

if docker ps | grep cvault-redis | grep -q "healthy"; then
    echo "✅ Redis is ready (port 6380)"
else
    echo "❌ Redis failed to start"
    exit 1
fi

# Start backend API
echo ""
echo "🔧 Starting Backend API..."
cd "$(dirname "$0")/backend" || exit 1
npm run dev > /tmp/cvault-backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo "⏳ Waiting for backend API..."
for i in {1..20}; do
    if curl -s http://localhost:3000/health >/dev/null 2>&1; then
        echo "✅ Backend API is ready (http://localhost:3000)"
        break
    fi
    sleep 1
done

# Start web demo
echo ""
echo "🌐 Starting Web Demo..."
cd "$(dirname "$0")/web-demo" || exit 1
npm run dev > /tmp/cvault-web-demo.log 2>&1 &
FRONTEND_PID=$!
echo "   Web Demo PID: $FRONTEND_PID"

# Wait for web demo to be ready
echo "⏳ Waiting for web demo..."
for i in {1..20}; do
    if curl -s http://localhost:5173/ >/dev/null 2>&1; then
        echo "✅ Web Demo is ready (http://localhost:5173)"
        break
    fi
    sleep 1
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ CVault Development Environment is Ready! ✨"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 URLs:"
echo "   Backend API: http://localhost:3000"
echo "   Web Demo:    http://localhost:5173"
echo ""
echo "🔑 Demo Credentials:"
echo "   API Key: a148620c598895d8a1bde0d6c7e18735c5c3db63be4e4e10cf7c3376feb49245"
echo "   Email:   test@example.com"
echo "   Password: SecurePass123!"
echo ""
echo "📝 Logs:"
echo "   Backend: tail -f /tmp/cvault-backend.log"
echo "   Web Demo: tail -f /tmp/cvault-web-demo.log"
echo ""
echo "🛑 To stop all services:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   docker compose -f backend/docker-compose.yml down"
echo ""
echo "💡 Press Enter to stop all services..."
read -r

# Cleanup
echo "🛑 Stopping services..."
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
cd "$(dirname "$0")/backend" && docker compose down
echo "✅ All services stopped"
