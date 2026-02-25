import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../utils/prisma';
import { hashPassword, verifyPassword, generateApiKey, generateApiSecret, hashApiSecret } from '../utils/crypto';
import { config } from '../config';

const googleClient = config.googleClientId
  ? new OAuth2Client(config.googleClientId)
  : null;

interface GooglePayload {
  sub: string;       // Google user ID
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

/**
 * Platform auth — users signing up/in directly on creovine.com
 * 
 * Different from CVault's tenant-scoped auth:
 *   - No API key required (this IS the platform, not a product SDK)
 *   - On register: creates a Tenant + TenantUser (as ADMIN)
 *   - On login: looks up TenantUser by email across all tenants
 */
export class PlatformAuthService {

  /**
   * Register with email + password.
   * Creates a new Tenant and the first user as ADMIN.
   */
  async register(dto: { email: string; password: string; name: string; company?: string }) {
    // Check if email is already registered
    const existing = await prisma.tenantUser.findFirst({
      where: { email: dto.email },
    });
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const passwordHash = await hashPassword(dto.password);
    const apiKey = generateApiKey();
    const rawSecret = generateApiSecret();
    const apiSecretHash = await hashApiSecret(rawSecret);

    // Create tenant + admin user in one transaction
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.company || dto.name,
          apiKey,
          apiSecretHash,
          status: 'TRIAL',
        },
      });

      const user = await tx.tenantUser.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          name: dto.name,
          passwordHash,
          role: 'ADMIN',
        },
      });

      return { tenant, user };
    });

    return {
      id: result.user.id,
      email: result.user.email!,
      name: result.user.name || dto.name,
      tenantId: result.tenant.id,
      role: result.user.role,
    };
  }

  /**
   * Login with email + password.
   */
  async login(dto: { email: string; password: string }) {
    const user = await prisma.tenantUser.findFirst({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password');
    }

    const valid = await verifyPassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    return {
      id: user.id,
      email: user.email!,
      name: user.name || '',
      tenantId: user.tenantId,
      role: user.role,
    };
  }

  /**
   * Sign in / sign up with a Google ID token (from @react-oauth/google).
   * If the user doesn't exist, creates a new Tenant + user.
   */
  async googleAuth(idToken: string) {
    if (!googleClient) {
      throw new Error('Google OAuth is not configured');
    }

    // Verify the ID token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.googleClientId,
    });

    const payload = ticket.getPayload() as GooglePayload | undefined;
    if (!payload || !payload.email) {
      throw new Error('Invalid Google token');
    }

    if (!payload.email_verified) {
      throw new Error('Google email is not verified');
    }

    // Check if user already exists (by googleId or email)
    let user = await prisma.tenantUser.findFirst({
      where: {
        OR: [
          { googleId: payload.sub },
          { email: payload.email },
        ],
      },
    });

    if (user) {
      // Link Google account if not already linked
      if (!user.googleId) {
        user = await prisma.tenantUser.update({
          where: { id: user.id },
          data: { googleId: payload.sub, name: user.name || payload.name },
        });
      }

      return {
        id: user.id,
        email: user.email!,
        name: user.name || payload.name || '',
        tenantId: user.tenantId,
        role: user.role,
      };
    }

    // New user — create Tenant + TenantUser
    const apiKey = generateApiKey();
    const rawSecret = generateApiSecret();
    const apiSecretHash = await hashApiSecret(rawSecret);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: payload.name || payload.email,
          apiKey,
          apiSecretHash,
          status: 'TRIAL',
        },
      });

      const newUser = await tx.tenantUser.create({
        data: {
          tenantId: tenant.id,
          email: payload.email,
          name: payload.name || null,
          googleId: payload.sub,
          role: 'ADMIN',
        },
      });

      return { tenant, user: newUser };
    });

    return {
      id: result.user.id,
      email: result.user.email!,
      name: result.user.name || payload.name || '',
      tenantId: result.tenant.id,
      role: result.user.role,
    };
  }

  /**
   * Get user by ID.
   */
  async getUserById(userId: string) {
    const user = await prisma.tenantUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    return user;
  }
}

export const platformAuthService = new PlatformAuthService();
