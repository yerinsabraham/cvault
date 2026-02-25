import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { platformAuthService } from '../services/platform-auth.service';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  name: z.string().min(1, 'Name is required').max(100),
  company: z.string().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const googleSchema = z.object({
  credential: z.string().min(1),
});

/**
 * Platform auth routes — mounted at /v1/auth
 * 
 * These are for creovine.com users (platform level).
 * No API key required — this is the platform itself, not a product SDK.
 */
export async function platformAuthRoutes(fastify: FastifyInstance) {

  // Register
  fastify.post('/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);
      const user = await platformAuthService.register(body);

      const token = fastify.jwt.sign(
        { userId: user.id, tenantId: user.tenantId, email: user.email, role: user.role },
        { expiresIn: '7d' }
      );

      return reply.status(201).send({ accessToken: token, user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);
      const user = await platformAuthService.login(body);

      const token = fastify.jwt.sign(
        { userId: user.id, tenantId: user.tenantId, email: user.email, role: user.role },
        { expiresIn: '7d' }
      );

      return reply.send({ accessToken: token, user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }
      return reply.status(401).send({
        error: error instanceof Error ? error.message : 'Login failed',
      });
    }
  });

  // Google OAuth
  fastify.post('/google', async (request, reply) => {
    try {
      const body = googleSchema.parse(request.body);
      const user = await platformAuthService.googleAuth(body.credential);

      const token = fastify.jwt.sign(
        { userId: user.id, tenantId: user.tenantId, email: user.email, role: user.role },
        { expiresIn: '7d' }
      );

      return reply.send({ accessToken: token, user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }
      fastify.log.error(error);
      return reply.status(401).send({
        error: error instanceof Error ? error.message : 'Google authentication failed',
      });
    }
  });

  // Get current user (requires JWT)
  fastify.get('/me', async (request, reply) => {
    try {
      await request.jwtVerify();
      const payload = request.user as any;

      const user = await platformAuthService.getUserById(payload.userId);
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({ user });
    } catch (error) {
      return reply.status(401).send({
        error: 'Invalid or expired token',
      });
    }
  });
}
