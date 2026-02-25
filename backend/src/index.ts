import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { authRoutes } from './routes/auth.routes';
import { deviceRoutes } from './routes/device.routes';
import { vpnRoutes } from './routes/vpn.routes';
import { licenseRoutes } from './routes/license.routes';
import { platformAuthRoutes } from './routes/platform-auth.routes';
import { prisma } from './utils/prisma';

const fastify = Fastify({
  logger: {
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
  },
});

async function start() {
  try {
    // Build allowed origins list — supports comma-separated CORS_ORIGIN env var
    const rawOrigin = process.env.CORS_ORIGIN ?? '*';
    const devOrigins = ['http://localhost:3000', 'http://localhost:3001'];
    let allowedOrigins: string[] | '*';
    if (rawOrigin === '*') {
      allowedOrigins = '*';
    } else {
      const prodOrigins = rawOrigin.split(',').map((o) => o.trim()).filter(Boolean);
      allowedOrigins = config.nodeEnv === 'production'
        ? [...prodOrigins, ...devOrigins]
        : [...prodOrigins, ...devOrigins];
    }

    // Register plugins
    await fastify.register(cors, {
      origin: (origin, cb) => {
        if (allowedOrigins === '*') return cb(null, true);
        if (!origin) return cb(null, true); // server-to-server / curl
        if ((allowedOrigins as string[]).includes(origin)) return cb(null, true);
        cb(new Error(`Origin ${origin} not allowed`), false);
      },
      credentials: true,
    });

    await fastify.register(jwt, {
      secret: config.jwtSecret,
    });

    await fastify.register(rateLimit, {
      max: 1000, // Increased for local testing
      timeWindow: '15 minutes',
    });

    // Root health check
    fastify.get('/', async () => {
      return { 
        message: 'Creovine API Platform',
        products: {
          cvault: '/cvault/v1'
        },
        timestamp: new Date().toISOString() 
      };
    });

    // Legacy health check
    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // ── Platform routes (no product prefix — this IS the platform) ──
    await fastify.register(
      async (fastify) => {
        await fastify.register(platformAuthRoutes, { prefix: '/auth' });
      },
      { prefix: '/v1' }
    );

    // ── CVault product routes ──
    await fastify.register(
      async (fastify) => {
              await fastify.register(authRoutes,    { prefix: '/auth' });
        await fastify.register(deviceRoutes,  { prefix: '/devices' });
        await fastify.register(vpnRoutes,     { prefix: '/vpn' });
        await fastify.register(licenseRoutes, { prefix: '/licenses' });
      },
      { prefix: '/cvault/v1' }
    );

    // Test database connection
    await prisma.$connect();
    fastify.log.info('Database connected successfully');

    // Start server
    const port = config.port;
    await fastify.listen({ port, host: '0.0.0.0' });
    
    fastify.log.info(`🚀 CVault Backend API running on http://localhost:${port}`);
    fastify.log.info(`Environment: ${config.nodeEnv}`);
    fastify.log.info(`VPN Server: ${config.wgServerSshHost}:${config.wgServerEndpointPort}`);
  } catch (err) {
    fastify.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  fastify.log.info('SIGTERM received, shutting down gracefully...');
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  fastify.log.info('SIGINT received, shutting down gracefully...');
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
});

start();
