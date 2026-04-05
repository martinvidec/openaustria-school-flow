import { Module } from '@nestjs/common';
import { TeacherAbsenceController } from './absence/teacher-absence.controller';
import { TeacherAbsenceService } from './absence/teacher-absence.service';
import { SubstitutionController } from './substitution/substitution.controller';
import { SubstitutionService } from './substitution/substitution.service';

/**
 * Phase 6 — Substitution Planning module.
 *
 * Plan 06-02 (this commit): TeacherAbsenceService + range expansion,
 * TeacherAbsenceController, SubstitutionService lifecycle (assign/respond/
 * entfall/stillarbeit) with ClassBookEntry linkage (D-14), and
 * SubstitutionController.
 *
 * Plan 06-03 adds RankingService, NotificationService + gateway.
 * Plan 06-04 adds HandoverService, statistics, and frontend glue.
 *
 * PrismaModule is @Global() (see apps/api/src/config/database/prisma.module.ts)
 * so no explicit import is necessary for service injection.
 */
@Module({
  controllers: [TeacherAbsenceController, SubstitutionController],
  providers: [TeacherAbsenceService, SubstitutionService],
  exports: [TeacherAbsenceService, SubstitutionService],
})
export class SubstitutionModule {}
