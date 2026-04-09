import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { HealthController } from './health.controller';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { PrismaService } from '../../config/database/prisma.service';
import type { ConfigService } from '@nestjs/config';

/**
 * DEPLOY-03 -- HealthController liveness + readiness tests.
 *
 * Covers:
 *  - Existing liveness endpoint behaviour (preserved)
 *  - /ready endpoint with DB / Redis / Keycloak connectivity checks
 *  - Partial-failure scenarios returning 503 with a `degraded` status
 *  - @Public() metadata on both endpoints (Pitfall 6 guard)
 */

// Hoist the ioredis mock so it installs before HealthController imports it.
// The mock exposes a single shared Redis constructor whose `ping()` and
// `quit()` methods tests can rewrite per-case.
const ioredisMock = vi.hoisted(() => {
  const pingFn = vi.fn().mockResolvedValue('PONG');
  const quitFn = vi.fn().mockResolvedValue('OK');
  const RedisCtor = vi.fn(() => ({
    ping: pingFn,
    quit: quitFn,
    on: vi.fn(),
  }));
  return { pingFn, quitFn, RedisCtor };
});

vi.mock('ioredis', () => ({
  default: ioredisMock.RedisCtor,
  Redis: ioredisMock.RedisCtor,
}));

// global.fetch mock for Keycloak readiness probe
const fetchMock = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).fetch = fetchMock;

function createController(overrides?: {
  prismaQuery?: () => Promise<unknown>;
  redisPing?: () => Promise<string>;
  keycloakOk?: boolean | 'throw';
}) {
  const prismaMock = {
    $queryRaw: vi.fn(overrides?.prismaQuery ?? (async () => [{ '?column?': 1 }])),
  } as unknown as PrismaService;

  // Reset shared mock functions
  ioredisMock.pingFn.mockReset();
  if (overrides?.redisPing) {
    ioredisMock.pingFn.mockImplementation(overrides.redisPing);
  } else {
    ioredisMock.pingFn.mockResolvedValue('PONG');
  }

  fetchMock.mockReset();
  if (overrides?.keycloakOk === 'throw') {
    fetchMock.mockRejectedValue(new Error('network error'));
  } else {
    fetchMock.mockResolvedValue({
      ok: overrides?.keycloakOk ?? true,
      status: overrides?.keycloakOk === false ? 503 : 200,
    });
  }

  const configMock: Partial<ConfigService> = {
    get: vi.fn((key: string, fallback?: unknown) => {
      if (key === 'REDIS_HOST') return 'localhost';
      if (key === 'REDIS_PORT') return 6379;
      if (key === 'KEYCLOAK_URL') return 'http://localhost:8080';
      if (key === 'KEYCLOAK_REALM') return 'schoolflow';
      return fallback;
    }) as ConfigService['get'],
  };

  return new HealthController(prismaMock, configMock as ConfigService);
}

function createReplyMock() {
  const statusFn = vi.fn();
  const sendFn = vi.fn();
  const reply = {
    status: statusFn.mockImplementation(() => reply),
    send: sendFn.mockImplementation((body) => body),
  };
  return { reply, statusFn, sendFn };
}

describe('HealthController', () => {
  beforeEach(() => {
    ioredisMock.RedisCtor.mockClear();
    ioredisMock.pingFn.mockClear();
    fetchMock.mockClear();
  });

  describe('GET /health (liveness)', () => {
    it('should return { status: ok } with service metadata', () => {
      const controller = createController();
      const result = controller.check();
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('service', 'schoolflow-api');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('GET /health/ready (readiness)', () => {
    it('returns 200 with status=ready when DB, Redis, and Keycloak are healthy', async () => {
      const controller = createController();
      const { reply, statusFn, sendFn } = createReplyMock();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await controller.ready(reply as any);

      expect(statusFn).toHaveBeenCalledWith(200);
      expect(sendFn).toHaveBeenCalledTimes(1);
      const body = sendFn.mock.calls[0]![0];
      expect(body).toMatchObject({
        status: 'ready',
        checks: { database: true, redis: true, keycloak: true },
      });
      expect(body).toHaveProperty('timestamp');
    });

    it('returns 503 with status=degraded when the database is unreachable', async () => {
      const controller = createController({
        prismaQuery: async () => {
          throw new Error('DB down');
        },
      });
      const { reply, statusFn, sendFn } = createReplyMock();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await controller.ready(reply as any);

      expect(statusFn).toHaveBeenCalledWith(503);
      const body = sendFn.mock.calls[0]![0];
      expect(body).toMatchObject({
        status: 'degraded',
        checks: { database: false, redis: true, keycloak: true },
      });
    });

    it('returns 503 with status=degraded when Redis is unreachable', async () => {
      const controller = createController({
        redisPing: async () => {
          throw new Error('Redis down');
        },
      });
      const { reply, statusFn, sendFn } = createReplyMock();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await controller.ready(reply as any);

      expect(statusFn).toHaveBeenCalledWith(503);
      const body = sendFn.mock.calls[0]![0];
      expect(body).toMatchObject({
        status: 'degraded',
        checks: { database: true, redis: false, keycloak: true },
      });
    });

    it('returns 503 with status=degraded when Keycloak is unreachable', async () => {
      const controller = createController({ keycloakOk: 'throw' });
      const { reply, statusFn, sendFn } = createReplyMock();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await controller.ready(reply as any);

      expect(statusFn).toHaveBeenCalledWith(503);
      const body = sendFn.mock.calls[0]![0];
      expect(body).toMatchObject({
        status: 'degraded',
        checks: { database: true, redis: true, keycloak: false },
      });
    });

    it('returns partial check results when multiple services fail', async () => {
      const controller = createController({
        prismaQuery: async () => {
          throw new Error('DB down');
        },
        keycloakOk: false,
      });
      const { reply, statusFn, sendFn } = createReplyMock();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await controller.ready(reply as any);

      expect(statusFn).toHaveBeenCalledWith(503);
      const body = sendFn.mock.calls[0]![0];
      expect(body.checks).toEqual({ database: false, redis: true, keycloak: false });
      expect(body.status).toBe('degraded');
    });
  });

  describe('Public decorator metadata (Pitfall 6)', () => {
    it('marks both /health and /health/ready as @Public()', () => {
      const reflector = new Reflector();

      const livenessPublic = reflector.get(IS_PUBLIC_KEY, HealthController.prototype.check);
      const readinessPublic = reflector.get(IS_PUBLIC_KEY, HealthController.prototype.ready);

      expect(livenessPublic).toBe(true);
      expect(readinessPublic).toBe(true);
    });
  });
});
