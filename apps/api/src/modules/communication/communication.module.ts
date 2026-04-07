import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubstitutionModule } from '../substitution/substitution.module';
import { ConversationService } from './conversation/conversation.service';
import { ConversationController } from './conversation/conversation.controller';

/**
 * Phase 7 -- Communication module.
 *
 * Plan 07-01 created the empty module + schema + test stubs.
 * Plan 07-02 wires ConversationService, ConversationController.
 * MessageService/Controller added in Task 2.
 *
 * Imports SubstitutionModule to access NotificationService + NotificationGateway
 * (exported by SubstitutionModule) for messaging notifications.
 * ConfigModule for KEYCLOAK_URL/KEYCLOAK_REALM config access in MessagingGateway.
 */
@Module({
  imports: [SubstitutionModule, ConfigModule],
  controllers: [ConversationController],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class CommunicationModule {}
