import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  // Server
  port: z.coerce.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  host: z.string().default('0.0.0.0'),

  // Database
  databaseUrl: z.string(),

  // JWT
  jwtSecret: z.string().min(32),
  jwtExpiresIn: z.string().default('15m'),
  refreshTokenExpiresIn: z.string().default('7d'),

  // API Encryption
  apiEncryptionKey: z.string().length(64), // 32 bytes in hex

  // WireGuard Server
  wgServerIp: z.string(),
  wgServerSshHost: z.string(),
  wgServerSshUser: z.string().default('root'),
  wgServerSshKeyPath: z.string(),
  wgServerPublicKey: z.string(),
  wgServerEndpointPort: z.coerce.number().default(51820),

  // IP Pool
  ipPoolStart: z.string().default('10.8.0.2'),
  ipPoolEnd: z.string().default('10.8.255.254'),
  ipPoolSubnet: z.string().default('10.8.0.0/16'),

  // Rate Limiting
  rateLimitMax: z.coerce.number().default(100),
  rateLimitTimeWindow: z.coerce.number().default(60000),

  // Logging
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // AWS
  awsRegion: z.string().default('us-east-1'),
  awsAccessKeyId: z.string().optional(),
  awsSecretAccessKey: z.string().optional(),

  // Redis (optional)
  redisUrl: z.string().optional(),
});

const env = {
  // Server
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
  host: process.env.HOST,

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,

  // API Encryption
  apiEncryptionKey: process.env.API_ENCRYPTION_KEY,

  // WireGuard Server
  wgServerIp: process.env.WG_SERVER_IP,
  wgServerSshHost: process.env.WG_SERVER_SSH_HOST,
  wgServerSshUser: process.env.WG_SERVER_SSH_USER,
  wgServerSshKeyPath: process.env.WG_SERVER_SSH_KEY_PATH,
  wgServerPublicKey: process.env.WG_SERVER_PUBLIC_KEY,
  wgServerEndpointPort: process.env.WG_SERVER_ENDPOINT_PORT,

  // IP Pool
  ipPoolStart: process.env.IP_POOL_START,
  ipPoolEnd: process.env.IP_POOL_END,
  ipPoolSubnet: process.env.IP_POOL_SUBNET,

  // Rate Limiting
  rateLimitMax: process.env.RATE_LIMIT_MAX,
  rateLimitTimeWindow: process.env.RATE_LIMIT_TIMEWINDOW,

  // Logging
  logLevel: process.env.LOG_LEVEL,

  // AWS
  awsRegion: process.env.AWS_REGION,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,

  // Redis
  redisUrl: process.env.REDIS_URL,
};

const parsed = configSchema.safeParse(env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const config = parsed.data;
