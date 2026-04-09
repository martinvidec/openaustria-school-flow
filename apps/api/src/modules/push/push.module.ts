import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PUSH_QUEUE } from '../../config/queue/queue.constants';
import { PushService } from './push.service';
import { PushProcessor } from './push.processor';
import { PushController } from './push.controller';

/**
 * Phase 9 Plan 03 -- Web Push notification module (MOBILE-02).
 *
 * Provides:
 *  - PushService (subscribe/unsubscribe/sendToUser/getVapidPublicKey)
 *  - PushProcessor (BullMQ worker consuming PUSH_QUEUE)
 *  - PushController (REST: POST/DELETE /push-subscriptions, GET /push/vapid-key)
 *
 * PUSH_QUEUE is registered here IN ADDITION to the global QueueModule
 * registration. QueueModule is @Global() so the injection token exists
 * application-wide, but modules that consume @InjectQueue for a named
 * queue must also register the queue locally in their own imports so the
 * BullMQ Worker/Processor provider graph resolves. This follows the
 * Phase 8 ImportModule pattern verbatim.
 *
 * Exports PushService so NotificationService (SubstitutionModule) and any
 * future consumers can inject it directly without going through the queue.
 */
@Module({
  imports: [BullModule.registerQueue({ name: PUSH_QUEUE })],
  controllers: [PushController],
  providers: [PushService, PushProcessor],
  exports: [PushService, BullModule],
})
export class PushModule {}
