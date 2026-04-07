import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubstitutionModule } from '../substitution/substitution.module';

/**
 * Phase 7 -- Communication module scaffold.
 *
 * Plan 07-01 creates the empty module + schema + test stubs.
 * Subsequent plans wire services, controllers, and gateways.
 *
 * Imports SubstitutionModule to access NotificationService + NotificationGateway
 * (exported by SubstitutionModule) for messaging notifications.
 * ConfigModule for KEYCLOAK_URL/KEYCLOAK_REALM config access in MessagingGateway.
 */
@Module({
  imports: [SubstitutionModule, ConfigModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class CommunicationModule {}
