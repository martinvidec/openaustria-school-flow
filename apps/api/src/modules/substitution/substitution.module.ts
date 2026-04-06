import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Absence (Plan 06-02)
import { TeacherAbsenceController } from './absence/teacher-absence.controller';
import { TeacherAbsenceService } from './absence/teacher-absence.service';

// Substitution lifecycle + ranking + stats (Plan 06-02 / 06-03 / 06-04)
import { SubstitutionController } from './substitution/substitution.controller';
import { SubstitutionService } from './substitution/substitution.service';
import { RankingService } from './substitution/ranking.service';
import { RankingController } from './substitution/ranking.controller';
import { SubstitutionStatsService } from './substitution/substitution-stats.service';
import { SubstitutionStatsController } from './substitution/substitution-stats.controller';

// Notification (Plan 06-03)
import { NotificationController } from './notification/notification.controller';
import { NotificationService } from './notification/notification.service';
import { NotificationGateway } from './notification/notification.gateway';

// Handover (Plan 06-03)
import { HandoverController } from './handover/handover.controller';
import { HandoverService } from './handover/handover.service';

// Cross-module dependencies (providers consumed by Phase 6 services)
import { TimetableModule } from '../timetable/timetable.module';
import { ClassBookModule } from '../classbook/classbook.module';

/**
 * Phase 6 — Substitution Planning module (final assembly).
 *
 * Plan 06-01 scaffolded the empty module + schema.
 * Plan 06-02 added TeacherAbsence + Substitution lifecycle services/controllers.
 * Plan 06-03 added Ranking, Notification (service+gateway+controller), Handover.
 * Plan 06-04 (this commit) wires everything together:
 *   - Imports TimetableModule so SubstitutionService can inject
 *     TimetableEventsGateway (exported by that module since Phase 4)
 *   - Imports ClassBookModule so SubstitutionStatsService can inject
 *     StatisticsService for Austrian semester date math
 *   - Registers JwtModule with Keycloak JWKS so NotificationGateway can
 *     verify handshake tokens (Pitfall 3)
 *   - Registers SubstitutionStatsService + SubstitutionStatsController (SUBST-06)
 *   - Registers RankingController exposing GET candidates (SUBST-02)
 *   - Exports SubstitutionService, NotificationService, and NotificationGateway
 *     for other modules (or the future frontend-bridging BFF) to consume
 *
 * PrismaModule is @Global() (see apps/api/src/config/database/prisma.module.ts)
 * so no explicit import is necessary for service injection.
 */
@Module({
  imports: [
    TimetableModule,
    ClassBookModule,
    ConfigModule,
  ],
  controllers: [
    TeacherAbsenceController,
    SubstitutionController,
    RankingController,
    SubstitutionStatsController,
    NotificationController,
    HandoverController,
  ],
  providers: [
    TeacherAbsenceService,
    SubstitutionService,
    RankingService,
    SubstitutionStatsService,
    NotificationService,
    NotificationGateway,
    HandoverService,
  ],
  exports: [
    TeacherAbsenceService,
    SubstitutionService,
    RankingService,
    SubstitutionStatsService,
    NotificationService,
    NotificationGateway,
    HandoverService,
  ],
})
export class SubstitutionModule {}
