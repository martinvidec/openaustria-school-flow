import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DSGVO_DELETION_QUEUE } from '../../../config/queue/queue.constants';
import { DataDeletionService } from '../deletion/data-deletion.service';

@Processor(DSGVO_DELETION_QUEUE)
export class DeletionProcessor extends WorkerHost {
  constructor(private dataDeletionService: DataDeletionService) {
    super();
  }

  async process(job: Job<{ personId: string; dsgvoJobId: string }>) {
    const { personId, dsgvoJobId } = job.data;
    await this.dataDeletionService.anonymizePerson(personId, dsgvoJobId);
    return { anonymized: true, personId };
  }
}
