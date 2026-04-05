import { describe, it, expect } from 'vitest';
import 'reflect-metadata';
import { SubstitutionModule } from './substitution.module';
import { TeacherAbsenceService } from './absence/teacher-absence.service';
import { TeacherAbsenceController } from './absence/teacher-absence.controller';
import { SubstitutionService } from './substitution/substitution.service';
import { SubstitutionController } from './substitution/substitution.controller';
import { RankingService } from './substitution/ranking.service';
import { RankingController } from './substitution/ranking.controller';
import { SubstitutionStatsService } from './substitution/substitution-stats.service';
import { SubstitutionStatsController } from './substitution/substitution-stats.controller';
import { NotificationService } from './notification/notification.service';
import { NotificationController } from './notification/notification.controller';
import { NotificationGateway } from './notification/notification.gateway';
import { HandoverService } from './handover/handover.service';
import { HandoverController } from './handover/handover.controller';

/**
 * Plan 06-04 final wiring test: verify SubstitutionModule declares every
 * provider, controller, and export required by Phase 6 without booting the
 * full Nest DI container (which would pull in Prisma, Redis, Keycloak JWKS).
 */
describe('SubstitutionModule wiring (Plan 06-04)', () => {
  const providers: any[] =
    Reflect.getMetadata('providers', SubstitutionModule) ?? [];
  const controllers: any[] =
    Reflect.getMetadata('controllers', SubstitutionModule) ?? [];
  const exportsMeta: any[] =
    Reflect.getMetadata('exports', SubstitutionModule) ?? [];

  it('declares all expected providers', () => {
    expect(providers).toContain(TeacherAbsenceService);
    expect(providers).toContain(SubstitutionService);
    expect(providers).toContain(RankingService);
    expect(providers).toContain(SubstitutionStatsService);
    expect(providers).toContain(NotificationService);
    expect(providers).toContain(NotificationGateway);
    expect(providers).toContain(HandoverService);
  });

  it('declares all expected controllers', () => {
    expect(controllers).toContain(TeacherAbsenceController);
    expect(controllers).toContain(SubstitutionController);
    expect(controllers).toContain(RankingController);
    expect(controllers).toContain(SubstitutionStatsController);
    expect(controllers).toContain(NotificationController);
    expect(controllers).toContain(HandoverController);
  });

  it('exports the services that Phase 6 consumers (SUBST-05 frontend hooks) depend on', () => {
    expect(exportsMeta).toContain(SubstitutionService);
    expect(exportsMeta).toContain(NotificationService);
    expect(exportsMeta).toContain(NotificationGateway);
  });
});
