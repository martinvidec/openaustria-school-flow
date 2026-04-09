import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * HealthModule -- exposes liveness and readiness endpoints (DEPLOY-03).
 *
 * Dependencies are injected from globally-registered modules:
 *  - PrismaService (from PrismaModule, @Global)
 *  - ConfigService (from ConfigModule, isGlobal: true)
 *
 * No explicit imports required.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
