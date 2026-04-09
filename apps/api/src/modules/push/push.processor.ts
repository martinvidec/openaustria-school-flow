import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PUSH_QUEUE } from '../../config/queue/queue.constants';
import { PushService, type PushPayload } from './push.service';

/**
 * Job payload handed off from NotificationService to the push queue.
 * userId is the Person.keycloakUserId — same identifier used by
 * NotificationService so recipient resolution stays consistent across
 * Socket.IO and web push delivery channels (D-06).
 */
export interface PushJobData {
  userId: string;
  payload: PushPayload;
}

/**
 * MOBILE-02 -- BullMQ worker for web push delivery (D-08).
 *
 * Responsibilities:
 *  - Consume `push-notification` jobs from PUSH_QUEUE
 *  - Invoke PushService.sendToUser which fans out to every user subscription
 *  - Swallow delivery errors: PushService already handles auto-cleanup on
 *    410/404 and logs transient failures. Rethrowing would trigger BullMQ
 *    retries, which compound the problem on 5xx errors and waste work on
 *    410s (the subscription is already gone).
 */
@Processor(PUSH_QUEUE)
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);

  constructor(private readonly pushService: PushService) {
    super();
  }

  async process(job: Job<PushJobData>): Promise<void> {
    try {
      await this.pushService.sendToUser(job.data.userId, job.data.payload);
    } catch (err) {
      // Do NOT rethrow — see class JSDoc for rationale. Logging is the
      // audit trail for debugging push delivery issues.
      this.logger.error(
        `Push delivery failed for user ${job.data.userId}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
