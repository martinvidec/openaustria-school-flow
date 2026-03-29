import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DSGVO_EXPORT_QUEUE } from '../../../config/queue/queue.constants';
import { DataExportService } from '../export/data-export.service';

@Processor(DSGVO_EXPORT_QUEUE)
export class ExportProcessor extends WorkerHost {
  constructor(private dataExportService: DataExportService) {
    super();
  }

  async process(job: Job<{ personId: string; dsgvoJobId: string }>) {
    await this.dataExportService.generateExport(job.data.personId, job.data.dsgvoJobId);
    return { exported: true, personId: job.data.personId };
  }
}
