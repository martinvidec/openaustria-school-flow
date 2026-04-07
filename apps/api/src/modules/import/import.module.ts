import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IMPORT_QUEUE } from '../../config/queue/queue.constants';
import { ImportService } from './import.service';
import { ImportProcessor } from './processors/import.processor';
import { ImportEventsGateway } from './import-events.gateway';
import { ImportController } from './import.controller';

/**
 * Phase 8 Plan 03 -- Data Import module.
 *
 * Provides:
 * - File upload + parsing (Untis XML/DIF, CSV)
 * - Dry-run validation without DB writes
 * - BullMQ background processing with Socket.IO progress
 * - Conflict resolution (skip/update/fail)
 * - Import history audit trail (D-08)
 *
 * Registers IMPORT_QUEUE locally for the BullMQ processor.
 * Exports ImportService for potential use by other modules.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: IMPORT_QUEUE }),
  ],
  controllers: [ImportController],
  providers: [ImportService, ImportProcessor, ImportEventsGateway],
  exports: [ImportService],
})
export class ImportModule {}
