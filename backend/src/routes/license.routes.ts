import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { licenseService } from '../services/license.service';
import { adminKeyAuth } from '../middleware/license.middleware';
import { apiKeyAuth } from '../middleware/auth.middleware';

// ─── Validation schemas ───────────────────────────────────────────────────────

const createSchema = z.object({
  tenantId:  z.string().uuid(),
  product:   z.string().min(1),
  plan:      z.enum(['TRIAL', 'STARTER', 'PRO', 'ENTERPRISE']).optional(),
  maxUses:   z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  metadata:  z.record(z.unknown()).optional(),
});

const validateBodySchema = z.object({
  key:     z.string().min(1),
  product: z.string().min(1),
});

// ─── Routes ──────────────────────────────────────────────────────────────────

export async function licenseRoutes(fastify: FastifyInstance) {

  // ── Admin: Create license ────────────────────────────────────────────────
  fastify.post('/', {
    preHandler: [adminKeyAuth],
    handler: async (request, reply) => {
      try {
        const body = createSchema.parse(request.body);
        const license = await licenseService.create({
          ...body,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        });
        return reply.status(201).send(license);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Validation Error', details: err.errors });
        }
        return reply.status(400).send({
          error: 'Create Failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  });

  // ── Admin: List licenses ─────────────────────────────────────────────────
  fastify.get('/', {
    preHandler: [adminKeyAuth],
    handler: async (request, reply) => {
      const q = request.query as Record<string, string>;
      const result = await licenseService.list({
        tenantId: q.tenantId,
        product:  q.product,
        plan:     q.plan,
        status:   q.status,
      });
      return reply.send(result);
    },
  });

  // ── Admin: Get single license ─────────────────────────────────────────────
  fastify.get('/:key', {
    preHandler: [adminKeyAuth],
    handler: async (request, reply) => {
      try {
        const { key } = request.params as { key: string };
        const license = await licenseService.getByKey(key);
        return reply.send(license);
      } catch (err) {
        return reply.status(404).send({
          error: 'Not Found',
          message: err instanceof Error ? err.message : 'License not found',
        });
      }
    },
  });

  // ── Admin: Revoke license ────────────────────────────────────────────────
  fastify.post('/:key/revoke', {
    preHandler: [adminKeyAuth],
    handler: async (request, reply) => {
      try {
        const { key } = request.params as { key: string };
        const license = await licenseService.revoke(key);
        return reply.send({ status: license.status, key: license.key });
      } catch (err) {
        return reply.status(404).send({
          error: 'Revoke Failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  });

  // ── Public: Validate license (used by SDK / app before connecting) ────────
  // Requires tenant API key (x-api-key) but NOT admin key
  fastify.post('/validate', {
    preHandler: [apiKeyAuth],
    handler: async (request, reply) => {
      try {
        const body    = validateBodySchema.parse(request.body);
        const result  = await licenseService.validate(body.key, body.product);

        if (!result.valid) {
          return reply.status(402).send({
            valid:      false,
            reason:     result.reason,
            upgradeUrl: result.upgradeUrl,
          });
        }

        return reply.send({
          valid:         true,
          plan:          result.plan,
          usesRemaining: result.usesRemaining,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Validation Error', details: err.errors });
        }
        return reply.status(500).send({
          error: 'Validation Failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  });
}
