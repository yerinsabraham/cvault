import { prisma } from '../utils/prisma';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { FastifyRequest } from 'fastify';

export interface RegisterUserDto {
  email: string;
  password: string;
}

export interface LoginUserDto {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Register a new tenant user
   */
  async register(tenantId: string, dto: RegisterUserDto) {
    // Check if user already exists
    const existing = await prisma.tenantUser.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: dto.email,
        },
      },
    });

    if (existing) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(dto.password);

    // Create user
    const user = await prisma.tenantUser.create({
      data: {
        tenantId,
        email: dto.email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Login a tenant user
   */
  async login(tenantId: string, dto: LoginUserDto) {
    // Find user
    const user = await prisma.tenantUser.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: dto.email,
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const valid = await verifyPassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      createdAt: user.createdAt,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    return prisma.tenantUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        createdAt: true,
      },
    });
  }
}

export const authService = new AuthService();

/**
 * Extract tenant from API key
 */
export async function getTenantFromApiKey(apiKey: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { apiKey },
  });

  if (!tenant) {
    throw new Error('Invalid API key');
  }

  if (tenant.status !== 'ACTIVE') {
    throw new Error('Tenant account is suspended');
  }

  return tenant;
}

/**
 * Verify API secret
 */
export async function verifyApiAuth(apiKey: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { apiKey },
  });

  return tenant !== null;
}

/**
 * Type definitions for authenticated requests
 */
export interface AuthenticatedRequest extends FastifyRequest {
  tenant?: {
    id: string;
    name: string;
    apiKey: string;
  };
}
