import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DSGVO_RETENTION_QUEUE } from '../../config/queue/queue.constants';
import { ConsentController } from './consent/consent.controller';
import { ConsentService } from './consent/consent.service';
import { RetentionController } from './retention/retention.controller';
import { RetentionService } from './retention/retention.service';
import { DsfaController } from './dsfa/dsfa.controller';
import { DsfaService } from './dsfa/dsfa.service';
import { DataDeletionController } from './deletion/data-deletion.controller';
import { DataDeletionService } from './deletion/data-deletion.service';
import { DataExportController } from './export/data-export.controller';
import { DataExportService } from './export/data-export.service';
import { PdfExportService } from './export/pdf-export.service';
import { DeletionProcessor } from './processors/deletion.processor';
import { ExportProcessor } from './processors/export.processor';
import { RetentionProcessor } from './processors/retention.processor';

@Module({
  controllers: [
    ConsentController,
    RetentionController,
    DsfaController,
    DataDeletionController,
    DataExportController,
  ],
  providers: [
    ConsentService,
    RetentionService,
    DsfaService,
    DataDeletionService,
    DataExportService,
    PdfExportService,
    DeletionProcessor,
    ExportProcessor,
    RetentionProcessor,
  ],
  exports: [ConsentService, RetentionService, DsfaService, DataDeletionService, DataExportService],
})
export class DsgvoModule implements OnModuleInit {
  private readonly logger = new Logger(DsgvoModule.name);

  constructor(
    @InjectQueue(DSGVO_RETENTION_QUEUE) private retentionQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.retentionQueue.add('retention-daily-check', {}, {
      repeat: { cron: '0 2 * * *' }, // Daily at 2 AM
      removeOnComplete: { count: 30 },
      removeOnFail: { count: 100 },
    });
    this.logger.log('Registered daily retention check cron job (0 2 * * *)');
  }
}
