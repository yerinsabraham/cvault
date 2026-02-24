import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { config } from '../config';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateLicenseInput {
  tenantId: string;
  product: string;
  plan?: 'TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  maxUses?: number | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}

export interface LicenseValidationResult {
  valid: boolean;
  reason?: 'trial_exhausted' | 'expired' | 'revoked' | 'invalid' | 'wrong_product';
  licenseId?: string;
  plan?: string;
  usesRemaining?: number | null; // null = unlimited
  upgradeUrl?: string;
}

// ─── Key Generation ───────────────────────────────────────────────────────────

const PRODUCT_PREFIXES: Record<string, string> = {
  'cvault-vpn': 'cvlt',
};

function generateKey(product: string, plan: string): string {
  const prefix = PRODUCT_PREFIXES[product] ?? 'crvn';
  const tier   = plan === 'TRIAL' ? 'trial' : 'live';
  const random = crypto.randomBytes(24).toString('hex');
  return `${prefix}_${tier}_${random}`;
}

// ─── Default plan limits ──────────────────────────────────────────────────────

const PLAN_DEFAULTS: Record<string, { maxUses: number | null }> = {
  TRIAL:      { maxUses: config.trialMaxUses },
  STARTER:    { maxUses: 100 },
  PRO:        { maxUses: null },   // unlimited
  ENTERPRISE: { maxUses: null },   // unlimited
};

// ─── Service ─────────────────────────────────────────────────────────────────

export const licenseService = {

  /**
   * Create a new license key for a tenant + product.
   * Called by the admin API endpoint.
   */
  async create(input: CreateLicenseInput) {
    const plan    = input.plan ?? 'TRIAL';
    const maxUses = input.maxUses !== undefined
      ? input.maxUses
      : PLAN_DEFAULTS[plan].maxUses;

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) throw new Error(`Tenant not found: ${input.tenantId}`);

    const key = generateKey(input.product, plan);

    return prisma.license.create({
      data: {
        key,
        tenantId:  input.tenantId,
        product:   input.product,
        plan:      plan as any,
        maxUses,
        expiresAt: input.expiresAt ?? null,
        metadata:  (input.metadata as any) ?? {},
      },
    });
  },

  /**
   * Validate a license key before allowing a VPN connect.
   * Does NOT increment the counter — call `incrementUsage` after success.
   */
  async validate(key: string, product: string): Promise<LicenseValidationResult> {
    const license = await prisma.license.findUnique({ where: { key } });

    if (!license) {
      return { valid: false, reason: 'invalid', upgradeUrl: 'https://creovine.com/upgrade' };
    }

    if (license.product !== product) {
      return { valid: false, reason: 'wrong_product', upgradeUrl: 'https://creovine.com/upgrade' };
    }

    if (license.status === 'REVOKED') {
      return { valid: false, reason: 'revoked', upgradeUrl: 'https://creovine.com/upgrade' };
    }

    if (license.expiresAt && license.expiresAt < new Date()) {
      // Auto-mark as expired
      await prisma.license.update({ where: { id: license.id }, data: { status: 'EXPIRED' } });
      return { valid: false, reason: 'expired', upgradeUrl: 'https://creovine.com/upgrade' };
    }

    if (license.maxUses !== null && license.usedCount >= license.maxUses) {
      return {
        valid: false,
        reason: license.plan === 'TRIAL' ? 'trial_exhausted' : 'trial_exhausted',
        upgradeUrl: 'https://creovine.com/upgrade',
      };
    }

    const usesRemaining = license.maxUses === null
      ? null
      : license.maxUses - license.usedCount;

    return {
      valid: true,
      licenseId: license.id,
      plan: license.plan,
      usesRemaining,
    };
  },

  /**
   * Atomically increment the usage counter after a successful VPN connect.
   */
  async incrementUsage(key: string) {
    return prisma.license.update({
      where: { key },
      data:  { usedCount: { increment: 1 } },
    });
  },

  /**
   * Revoke a license key immediately.
   */
  async revoke(key: string) {
    const license = await prisma.license.findUnique({ where: { key } });
    if (!license) throw new Error('License not found');
    return prisma.license.update({
      where: { key },
      data:  { status: 'REVOKED' },
    });
  },

  /**
   * List licenses with optional filters.
   */
  async list(filters: { tenantId?: string; product?: string; plan?: string; status?: string }) {
    const where: Record<string, unknown> = {};
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.product)  where.product  = filters.product;
    if (filters.plan)     where.plan     = filters.plan;
    if (filters.status)   where.status   = filters.status;

    const [licenses, total] = await Promise.all([
      prisma.license.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { tenant: { select: { id: true, name: true } } },
      }),
      prisma.license.count({ where }),
    ]);

    return { licenses, total };
  },

  /**
   * Get a single license by key.
   */
  async getByKey(key: string) {
    const license = await prisma.license.findUnique({
      where: { key },
      include: { tenant: { select: { id: true, name: true } } },
    });
    if (!license) throw new Error('License not found');

    const usesRemaining = license.maxUses === null
      ? null
      : Math.max(0, license.maxUses - license.usedCount);

    return { ...license, usesRemaining };
  },

  /**
   * Get or create the default trial license for a tenant + product.
   * Used when the SDK connects without explicitly passing a license key.
   */
  async getOrCreateTrialFor(tenantId: string, product: string) {
    const existing = await prisma.license.findFirst({
      where: { tenantId, product, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing;

    // Auto-create a trial license on first connect
    return this.create({ tenantId, product, plan: 'TRIAL' });
  },
};
