import { Module } from '@nestjs/common';
import { TeacherAbsenceController } from './absence/teacher-absence.controller';
import { TeacherAbsenceService } from './absence/teacher-absence.service';

/**
 * Phase 6 — Substitution Planning module.
 *
 * Plan 06-02 (this commit): TeacherAbsenceService + range expansion,
 * TeacherAbsenceController, and the Substitution lifecycle service/controller
 * (added in Task 2).
 *
 * Plan 06-03 adds RankingService, NotificationService + gateway.
 * Plan 06-04 adds HandoverService, statistics, and frontend glue.
 *
 * PrismaModule is @Global() (see apps/api/src/config/database/prisma.module.ts)
 * so no explicit import is necessary for service injection.
 */
@Module({
  controllers: [TeacherAbsenceController],
  providers: [TeacherAbsenceService],
  exports: [TeacherAbsenceService],
})
export class SubstitutionModule {}
