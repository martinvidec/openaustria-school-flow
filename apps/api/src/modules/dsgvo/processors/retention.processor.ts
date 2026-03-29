import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DSGVO_RETENTION_QUEUE } from '../../../config/queue/queue.constants';
import { RetentionService } from '../retention/retention.service';

@Processor(DSGVO_RETENTION_QUEUE)
export class RetentionProcessor extends WorkerHost {
  constructor(private retentionService: RetentionService) {
    super();
  }

  async process(job: Job<{ schoolId?: string }>) {
    // If schoolId provided, check that school only
    // Otherwise, check all schools
    const results = await this.retentionService.checkExpiredRecords(job.data.schoolId);
    return { processed: true, results };
  }
}
