import { Controller, Get, Res, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import Redis from 'ioredis';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../../config/database/prisma.service';

/**
 * Fastify reply shape used by the readiness endpoint.
 *
 * Declared inline (not imported from `fastify`) because pnpm strict hoisting
 * prevents a direct `fastify` import from the API package, matching the same
 * convention used by `ProblemDetailFilter` (Phase 01 decision).
 */
interface FastifyLikeReply {
  status(code: number): FastifyLikeReply;
  send(body: unknown): unknown;
}

@ApiTags('health')
@Controller('health')
export class HealthController implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly keycloakUrl: string;
  private readonly keycloakRealm: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    // Lightweight dedicated Redis client for health checks. BullMQ owns its
    // own connections, so this separate client avoids sharing state with the
    // queue workers.
    this.redis = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      // Fail fast on connect errors so /ready returns 503 quickly instead of
      // hanging while ioredis retries.
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    // Swallow connection errors — the readiness probe catches ping() failures.
    this.redis.on('error', () => {
      /* noop */
    });

    this.keycloakUrl = this.config.get<string>('KEYCLOAK_URL', 'http://localhost:8080');
    this.keycloakRealm = this.config.get<string>('KEYCLOAK_REALM', 'schoolflow');
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
    } catch {
      /* noop */
    }
  }

  /**
   * GET /health -- liveness probe (D-11, DEPLOY-03).
   *
   * Returns 200 as long as the API process is alive and able to answer HTTP
   * requests. Does NOT verify external dependencies -- that is the job of
   * GET /health/ready. Docker `HEALTHCHECK` directives should target this
   * endpoint for liveness.
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Liveness check -- API process is responsive' })
  @ApiResponse({ status: 200, description: 'API is alive' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'schoolflow-api',
    };
  }

  /**
   * GET /health/ready -- readiness probe (D-11, DEPLOY-03).
   *
   * Verifies connectivity to PostgreSQL, Redis, and Keycloak. Returns 200
   * when all three are reachable; 503 with a `degraded` status and per-check
   * details otherwise. Kubernetes / Docker Compose orchestrators should gate
   * traffic routing on this endpoint.
   */
  @Get('ready')
  @Public()
  @ApiOperation({
    summary: 'Readiness check -- verifies database, Redis, and Keycloak connectivity',
  })
  @ApiResponse({ status: 200, description: 'All dependencies healthy' })
  @ApiResponse({ status: 503, description: 'One or more dependencies unhealthy' })
  async ready(@Res() res: FastifyLikeReply) {
    const checks = { database: false, redis: false, keycloak: false };

    // PostgreSQL connectivity via Prisma
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      /* checks.database stays false */
    }

    // Redis connectivity via dedicated ioredis client
    try {
      const pong = await this.redis.ping();
      checks.redis = pong === 'PONG';
    } catch {
      /* checks.redis stays false */
    }

    // Keycloak connectivity via realm discovery document
    try {
      const response = await fetch(
        `${this.keycloakUrl}/realms/${this.keycloakRealm}`,
      );
      checks.keycloak = response.ok;
    } catch {
      /* checks.keycloak stays false */
    }

    const allHealthy = Object.values(checks).every(Boolean);
    const body = {
      status: allHealthy ? 'ready' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };

    return res.status(allHealthy ? 200 : 503).send(body);
  }
}
