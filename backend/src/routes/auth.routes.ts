import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService, AuthenticatedRequest } from '../services/auth.service';
import { apiKeyAuth, fullAuth } from '../middleware/auth.middleware';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Register a new user
  fastify.post('/register', {
    preHandler: [apiKeyAuth],
    handler: async (request, reply) => {
      try {
        const body = registerSchema.parse(request.body);
        const req = request as AuthenticatedRequest;
        
        const user = await authService.register(req.tenant!.id, body);
        
        // Generate JWT
        const token = fastify.jwt.sign({
          userId: user.id,
          tenantId: req.tenant!.id,
          email: user.email,
        });

        return reply.status(201).send({
          user: {
            id: user.id,
            email: user.email,
            tenantId: req.tenant!.id,
            createdAt: user.createdAt,
          },
          accessToken: token,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation Error',
            details: error.errors,
          });
        }
        
        return reply.status(400).send({
          error: 'Registration Failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // Login a user
  fastify.post('/login', {
    preHandler: [apiKeyAuth],
    handler: async (request, reply) => {
      try {
        const body = loginSchema.parse(request.body);
        const req = request as AuthenticatedRequest;
        
        const user = await authService.login(req.tenant!.id, body);
        
        // Generate JWT
        const token = fastify.jwt.sign({
          userId: user.id,
          tenantId: user.tenantId,
          email: user.email,
        });

        return reply.send({
          user: {
            id: user.id,
            email: user.email,
            tenantId: user.tenantId,
            createdAt: user.createdAt,
          },
          accessToken: token,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation Error',
            details: error.errors,
          });
        }
        
        return reply.status(401).send({
          error: 'Login Failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // Get current user
  fastify.get('/me', {
    preHandler: [fullAuth],
    handler: async (request, reply) => {
      const user = await authService.getUserById(((request as any).user as any).id);
      
      if (!user) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      return reply.send({ user });
    },
  });
}
