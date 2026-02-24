import { FastifyRequest, FastifyReply } from 'fastify';
import { getTenantFromApiKey, AuthenticatedRequest } from '../services/auth.service';

/**
 * Middleware to validate API key and load tenant
 */
export async function apiKeyAuth(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'] as string;

  if (!apiKey) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'API key is required',
    });
  }

  try {
    const tenant = await getTenantFromApiKey(apiKey);
    
    // Attach tenant to request
    (request as AuthenticatedRequest).tenant = {
      id: tenant.id,
      name: tenant.name,
      apiKey: tenant.apiKey,
    };
  } catch (error) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Invalid API key',
    });
  }
}

/**
 * Middleware to validate JWT and load user
 */
export async function jwtAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    
    // JWT payload is attached to request.user by @fastify/jwt
    const payload = request.user as any;
    
    (request as AuthenticatedRequest).user = {
      id: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email || null,
    };
  } catch (error) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

/**
 * Combined middleware: API key + JWT
 */
export async function fullAuth(request: FastifyRequest, reply: FastifyReply) {
  await apiKeyAuth(request, reply);
  if (reply.sent) return;
  
  await jwtAuth(request, reply);
}
