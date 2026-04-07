import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubstitutionModule } from '../substitution/substitution.module';
import { ClassBookModule } from '../classbook/classbook.module';
import { ConversationService } from './conversation/conversation.service';
import { ConversationController } from './conversation/conversation.controller';
import { MessageService } from './message/message.service';
import {
  MessageController,
  ConversationReadController,
  AbsenceReportController,
} from './message/message.controller';
import { PollService } from './poll/poll.service';
import { PollController } from './poll/poll.controller';
import { MessagingGateway } from './messaging.gateway';

/**
 * Phase 7 -- Communication module.
 *
 * Plan 07-01 created the empty module + schema + test stubs.
 * Plan 07-02 wires ConversationService, ConversationController,
 *   MessageService, MessageController, ConversationReadController.
 * Plan 07-03 adds file attachments (COMM-04), absence reporting (COMM-05),
 *   PollService + PollController (COMM-06), ClassBookModule import for ExcuseService.
 *
 * Imports SubstitutionModule to access NotificationService + NotificationGateway
 * (exported by SubstitutionModule) for messaging notifications.
 * Imports ClassBookModule for ExcuseService (absence reporting COMM-05).
 * ConfigModule for KEYCLOAK_URL/KEYCLOAK_REALM config access in MessagingGateway.
 */
@Module({
  imports: [SubstitutionModule, ClassBookModule, ConfigModule],
  controllers: [
    ConversationController,
    MessageController,
    ConversationReadController,
    AbsenceReportController,
    PollController,
  ],
  providers: [ConversationService, MessageService, PollService, MessagingGateway],
  exports: [ConversationService, MessageService, PollService, MessagingGateway],
})
export class CommunicationModule {}
