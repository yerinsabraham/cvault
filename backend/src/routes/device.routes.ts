import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { deviceService } from '../services/device.service';
import { fullAuth } from '../middleware/auth.middleware';

const registerDeviceSchema = z.object({
  deviceName: z.string().min(1).max(128),
  deviceType: z.enum(['iOS', 'Android', 'Windows', 'macOS', 'Linux']).optional(),
});

export async function deviceRoutes(fastify: FastifyInstance) {
  // Register a new device for the authenticated user
  fastify.post('/', {
    preHandler: [fullAuth],
    handler: async (request, reply) => {
      try {
        const body = registerDeviceSchema.parse(request.body);
        const userId = ((request as any).user as any).id;
        
        const result = await deviceService.registerDevice(
          userId,
          { deviceName: body.deviceName }
        );

        return reply.status(201).send(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation Error',
            details: error.errors,
          });
        }
        
        return reply.status(500).send({
          error: 'Device Registration Failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // Get all devices for the authenticated user
  fastify.get('/', {
    preHandler: [fullAuth],
    handler: async (request, reply) => {
      try {
        const userId = ((request as any).user as any).id;
        
        const devices = await deviceService.getUserDevices(userId);

        return reply.send({
          devices,
          totalCount: devices.length,
        });
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to retrieve devices',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // Get WireGuard configuration for a specific device
  fastify.get('/:deviceId/config', {
    preHandler: [fullAuth],
    handler: async (request, reply) => {
      try {
        const { deviceId } = request.params as { deviceId: string };
        const userId = (request.user as any).userId;
        
        const config = await deviceService.getDeviceConfig(deviceId, userId);

        return reply.send({
          deviceId,
          config,
        });
      } catch (error) {
        return reply.status(404).send({
          error: 'Device Not Found',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // Delete a device (deactivate VPN access)
  fastify.delete('/:deviceId', {
    preHandler: [fullAuth],
    handler: async (request, reply) => {
      try {
        const { deviceId } = request.params as { deviceId: string };
        const userId = (request.user as any).userId;
        
        await deviceService.deleteDevice(deviceId, userId);

        return reply.status(204).send();
      } catch (error) {
        return reply.status(404).send({
          error: 'Device Not Found',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
}
