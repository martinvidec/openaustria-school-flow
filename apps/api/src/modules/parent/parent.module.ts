import { Module } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { ParentService } from './parent.service';
import { ParentController } from './parent.controller';

/**
 * Phase 12-01 ParentModule greenfield (STUDENT-02 / D-13.1).
 *
 * Registers the public /parents controller + service. The PrismaService
 * provider lives here (mirrors Phase 11-01 StudentModule precedent) so the
 * module is self-contained; it does not need to be imported elsewhere.
 */
@Module({
  controllers: [ParentController],
  providers: [ParentService, PrismaService],
  exports: [ParentService],
})
export class ParentModule {}
