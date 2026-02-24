import { FastifyRequest, FastifyReply } from 'fastify';
import { licenseService } from '../services/license.service';
import { config } from '../config';

/**
 * Admin-key guard — required for all /licenses admin endpoints.
 * The admin key is set via ADMIN_SECRET env variable.
 */
export async function adminKeyAuth(request: FastifyRequest, reply: FastifyReply) {
  const adminKey = request.headers['x-admin-key'] as string;
  if (!adminKey || adminKey !== config.adminSecret) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Valid admin key required (x-admin-key header)',
    });
  }
}

/**
 * License check — called as preHandler on POST /vpn/connect.
 *
 * Reads the tenant from the request (set by apiKeyAuth) and checks:
 *  1. If a licenseKey is passed in the body → validate that specific key
 *  2. Otherwise → look up the tenant's active license for this product
 *
 * On success: attaches `{ licenseKey, licenseId }` to request for the handler
 *             to call `incrementUsage` after the session is created.
 * On failure: returns 402 Payment Required.
 */
export async function licenseCheck(request: FastifyRequest, reply: FastifyReply) {
  const tenant = (request as any).tenant;
  if (!tenant) return; // apiKeyAuth already rejected this — won't reach here

  const body        = request.body as Record<string, unknown> | null ?? {};
  const licenseKey  = (body.licenseKey as string | undefined) ?? undefined;
  const product     = 'cvault-vpn';

  let keyToValidate: string;

  if (licenseKey) {
    keyToValidate = licenseKey;
  } else {
    // No key passed — get or create the tenant's default trial license
    const trial = await licenseService.getOrCreateTrialFor(tenant.id, product);
    keyToValidate = trial.key;
  }

  const result = await licenseService.validate(keyToValidate, product);

  if (!result.valid) {
    const messages: Record<string, string> = {
      trial_exhausted: 'Trial limit reached. Upgrade to continue.',
      expired:         'Your license has expired. Renew to continue.',
      revoked:         'This license key has been revoked.',
      invalid:         'Invalid license key.',
      wrong_product:   'This license key is not valid for this product.',
    };

    return reply.status(402).send({
      error: 'LicenseRequired',
      reason: result.reason,
      message: messages[result.reason ?? 'invalid'] ?? 'License check failed.',
      upgradeUrl: result.upgradeUrl,
    });
  }

  // Attach to request so the handler can call incrementUsage
  (request as any).license = { key: keyToValidate, id: result.licenseId };
}
