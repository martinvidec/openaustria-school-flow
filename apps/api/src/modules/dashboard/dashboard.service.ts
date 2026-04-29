import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { SchoolService } from '../school/school.service';
import {
  CategoryStatus,
  CategoryStatusDto,
  DashboardStatusDto,
} from './dto/dashboard-status.dto';

/**
 * DashboardService — Setup-Completeness aggregator (Phase 16 Plan 01).
 *
 * Single round-trip read endpoint per CONTEXT D-10. Implements:
 *   - D-06 10-category schema (locked order; ternary status per row)
 *   - D-23 solver heuristic (configExists union + COMPLETED run gate)
 *   - D-24 timegrid heuristic (Period count AND active-SchoolDay count)
 *
 * Tenant resolution mirrors the canonical pattern from
 * `calendar.service.ts:79-80` and `user-context.service.ts:9-11` —
 * `Person.findFirst({ where: { keycloakUserId } })`.
 *
 * Approach B per RESEARCH §C.1: direct PrismaService consumer + SchoolService
 * for the address-completeness check. NO TimetableModule / DsgvoModule import
 * (RESEARCH Pitfall #2 — would duplicate cron schedules).
 */
@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private school: SchoolService,
  ) {}

  /**
   * Resolve the tenant (schoolId) of an admin from the Keycloak `sub` UUID.
   *
   * AuthenticatedUser does NOT carry a `schoolId` field — only `id` (Keycloak
   * sub UUID), `email`, `username`, `roles`. The codebase's established
   * pattern for resolving the tenant of a logged-in user is
   * `Person.findFirst({ where: { keycloakUserId } })`. Admins have a Person
   * row with their schoolId (verified in `calendar.service.ts:79-80` and
   * `user-context.service.ts:9-11`).
   */
  async resolveAdminSchoolId(keycloakUserId: string): Promise<string | null> {
    const person = await this.prisma.person.findFirst({
      where: { keycloakUserId },
      select: { schoolId: true },
    });
    return person?.schoolId ?? null;
  }

  /**
   * Aggregate the 10-category Setup-Completeness status for a tenant.
   *
   * 17 reads in `Promise.all`:
   *   1.  school (via SchoolService.findOne — wraps NotFoundException to null)
   *   2.  timeGrid (with periods include — drives Period.count for D-24)
   *   3.  schoolDay.count(isActive=true) — D-24 active-day union
   *   4.  schoolYear.findFirst(any) — partial gate
   *   5.  schoolYear.findFirst(isActive=true) — done gate + label
   *   6.  subject.count
   *   7.  teacher.count (Person.isAnonymized=false — Person has no isArchived)
   *   8.  class.count (model name `class` per Prisma client)
   *   9.  student.count (isArchived=false)
   *   10. student.count(classId=null) — drives ternary
   *   11. timetableRun.count(status=COMPLETED) — D-23 done gate
   *   12. constraintWeightOverride.count — D-23 configExists union part 1
   *   13. constraintTemplate.count — D-23 configExists union part 2
   *   14. retentionPolicy.count
   *   15. dsfaEntry.count
   *   16. vvzEntry.count
   *   17. auditEntry.count — DEVIATION: AuditEntry schema has NO schoolId
   *       column (apps/api/prisma/schema.prisma line 231-249). Per plan
   *       fallback: global count, documented in 16-01-SUMMARY.md.
   */
  async getStatus(schoolId: string): Promise<DashboardStatusDto> {
    const [
      school,
      timeGrid,
      activeSchoolDayCount,
      anySchoolYear,
      activeYear,
      subjectCount,
      teacherCount,
      classCount,
      studentCount,
      studentsWithoutClass,
      completedRunCount,
      weightOverrideCount,
      templateCount,
      retentionCount,
      dsfaCount,
      vvzCount,
      auditCount,
    ] = await Promise.all([
      // 1. School profile (SchoolService throws NotFoundException → null)
      this.school.findOne(schoolId).catch(() => null),
      // 2. TimeGrid + periods include
      this.prisma.timeGrid.findUnique({
        where: { schoolId },
        include: { periods: true },
      }),
      // 3. Active school days (D-24 union)
      this.prisma.schoolDay.count({ where: { schoolId, isActive: true } }),
      // 4. Any SchoolYear
      this.prisma.schoolYear.findFirst({ where: { schoolId } }),
      // 5. Active SchoolYear (drives done state + label)
      this.prisma.schoolYear.findFirst({
        where: { schoolId, isActive: true },
      }),
      // 6. Subjects
      this.prisma.subject.count({ where: { schoolId } }),
      // 7. Teachers — Person.isAnonymized=false (Person has no `isArchived`
      //    field; the plan said `isArchived: false` but the schema only
      //    defines `isAnonymized` on Person — see schema.prisma line 331).
      //    Using isAnonymized matches the pattern in
      //    data-deletion.service.spec.ts.
      this.prisma.teacher.count({
        where: { schoolId, person: { isAnonymized: false } },
      }),
      // 8. Classes — Prisma client model name is `schoolClass` (the schema
      //    uses `model SchoolClass` per schema.prisma:461; plan referred to
      //    it as "class" which is a TypeScript reserved keyword and not
      //    exposed on PrismaService).
      this.prisma.schoolClass.count({ where: { schoolId } }),
      // 9. Active students
      this.prisma.student.count({ where: { schoolId, isArchived: false } }),
      // 10. Students with no class assignment (drives partial state)
      this.prisma.student.count({
        where: { schoolId, isArchived: false, classId: null },
      }),
      // 11. Successful TimetableRuns (D-23 done gate)
      this.prisma.timetableRun.count({
        where: { schoolId, status: 'COMPLETED' },
      }),
      // 12. ConstraintWeightOverride (D-23 configExists union)
      this.prisma.constraintWeightOverride.count({ where: { schoolId } }),
      // 13. ConstraintTemplate (D-23 configExists union)
      this.prisma.constraintTemplate.count({ where: { schoolId } }),
      // 14. RetentionPolicy
      this.prisma.retentionPolicy.count({ where: { schoolId } }),
      // 15. DsfaEntry
      this.prisma.dsfaEntry.count({ where: { schoolId } }),
      // 16. VvzEntry
      this.prisma.vvzEntry.count({ where: { schoolId } }),
      // 17. AuditEntry — schema has no schoolId column → global count.
      //     Documented as a known deviation in 16-01-SUMMARY.md.
      this.prisma.auditEntry.count(),
    ]);

    const periodCount = timeGrid?.periods?.length ?? 0;

    const categories: CategoryStatusDto[] = [
      this.buildSchoolCategory(school),
      this.buildTimegridCategory(periodCount, activeSchoolDayCount),
      this.buildSchoolYearCategory(anySchoolYear, activeYear),
      this.buildBinaryCategory('subjects', subjectCount, {
        done: (n) => `${n} Fächer angelegt`,
        missing: 'Noch keine Fächer',
      }),
      this.buildBinaryCategory('teachers', teacherCount, {
        done: (n) => `${n} Lehrer:innen`,
        missing: 'Noch keine Lehrer:innen',
      }),
      this.buildBinaryCategory('classes', classCount, {
        done: (n) => `${n} Klassen`,
        missing: 'Noch keine Klassen',
      }),
      this.buildStudentsCategory(studentCount, studentsWithoutClass),
      this.buildSolverCategory(
        weightOverrideCount,
        templateCount,
        completedRunCount,
      ),
      this.buildDsgvoCategory(retentionCount, dsfaCount, vvzCount),
      this.buildBinaryCategory('audit', auditCount, {
        done: (n) => `${n} protokollierte Aktionen`,
        missing: 'Noch keine Aktionen protokolliert',
      }),
    ];

    return {
      schoolId,
      generatedAt: new Date().toISOString(),
      categories,
    };
  }

  // -------------------------------------------------------------------------
  // Per-category builders — pure functions of the read-side data
  // -------------------------------------------------------------------------

  private buildSchoolCategory(
    school: { name?: string; schoolType?: unknown; address?: unknown } | null,
  ): CategoryStatusDto {
    if (!school) {
      return {
        key: 'school',
        status: 'missing',
        secondary: 'Noch keine Schule angelegt',
      };
    }

    const hasName = !!school.name;
    const hasType = !!school.schoolType;
    const addr = school.address;
    const isObj = !!addr && typeof addr === 'object';
    const street = isObj ? (addr as Record<string, unknown>).street : undefined;
    const postalCode = isObj
      ? (addr as Record<string, unknown>).postalCode
      : undefined;
    const city = isObj ? (addr as Record<string, unknown>).city : undefined;
    const addressComplete = !!street && !!postalCode && !!city;
    const addressPartial = isObj && (!!street || !!postalCode || !!city);

    if (hasName && hasType && addressComplete) {
      return {
        key: 'school',
        status: 'done',
        secondary: 'Stammdaten vollständig',
      };
    }
    if (hasName || hasType || addressPartial) {
      return {
        key: 'school',
        status: 'partial',
        secondary: 'Adresse oder Kontakt fehlt',
      };
    }
    return {
      key: 'school',
      status: 'missing',
      secondary: 'Noch keine Schule angelegt',
    };
  }

  private buildTimegridCategory(
    periodCount: number,
    activeSchoolDayCount: number,
  ): CategoryStatusDto {
    if (periodCount === 0) {
      return {
        key: 'timegrid',
        status: 'missing',
        secondary: 'Noch keine Perioden definiert',
      };
    }
    if (activeSchoolDayCount === 0) {
      return {
        key: 'timegrid',
        status: 'partial',
        secondary: 'Wochentage fehlen',
      };
    }
    return {
      key: 'timegrid',
      status: 'done',
      secondary: `${periodCount} Perioden + Wochentage konfiguriert`,
    };
  }

  private buildSchoolYearCategory(
    anyYear: unknown,
    activeYear: { name?: string; startDate?: Date; endDate?: Date } | null,
  ): CategoryStatusDto {
    if (
      activeYear &&
      activeYear.name &&
      activeYear.startDate &&
      activeYear.endDate
    ) {
      return {
        key: 'schoolyear',
        status: 'done',
        secondary: `Aktives Schuljahr: ${activeYear.name}`,
      };
    }
    if (anyYear) {
      return {
        key: 'schoolyear',
        status: 'partial',
        secondary: 'Schuljahr unvollständig',
      };
    }
    return {
      key: 'schoolyear',
      status: 'missing',
      secondary: 'Noch kein Schuljahr',
    };
  }

  private buildBinaryCategory(
    key: 'subjects' | 'teachers' | 'classes' | 'audit',
    n: number,
    copy: { done: (n: number) => string; missing: string },
  ): CategoryStatusDto {
    if (n >= 1) {
      return { key, status: 'done', secondary: copy.done(n) };
    }
    return { key, status: 'missing', secondary: copy.missing };
  }

  private buildStudentsCategory(
    total: number,
    withoutClass: number,
  ): CategoryStatusDto {
    if (total === 0) {
      return {
        key: 'students',
        status: 'missing',
        secondary: 'Noch keine Schüler:innen',
      };
    }
    if (withoutClass >= 1) {
      return {
        key: 'students',
        status: 'partial',
        secondary: `${withoutClass} ohne Klassenzuordnung`,
      };
    }
    return {
      key: 'students',
      status: 'done',
      secondary: `${total} Schüler:innen, alle einer Klasse zugeordnet`,
    };
  }

  private buildSolverCategory(
    weightOverrideCount: number,
    templateCount: number,
    completedRunCount: number,
  ): CategoryStatusDto {
    const configExists = weightOverrideCount + templateCount > 0;
    if (!configExists) {
      return {
        key: 'solver',
        status: 'missing',
        secondary: 'Noch keine Konfiguration',
      };
    }
    if (completedRunCount === 0) {
      return {
        key: 'solver',
        status: 'partial',
        secondary: 'Konfiguration vorhanden, noch kein Lauf erfolgreich',
      };
    }
    return {
      key: 'solver',
      status: 'done',
      secondary: `Konfiguriert + ${completedRunCount} erfolgreich generierte Pläne`,
    };
  }

  private buildDsgvoCategory(
    retention: number,
    dsfa: number,
    vvz: number,
  ): CategoryStatusDto {
    if (retention >= 1 && dsfa >= 1 && vvz >= 1) {
      return {
        key: 'dsgvo',
        status: 'done',
        secondary: 'Aufbewahrung, DSFA und VVZ gepflegt',
      };
    }
    if (retention >= 1 && (dsfa === 0 || vvz === 0)) {
      return {
        key: 'dsgvo',
        status: 'partial',
        secondary: 'Aufbewahrung gesetzt, DSFA/VVZ unvollständig',
      };
    }
    return {
      key: 'dsgvo',
      status: 'missing',
      secondary: 'Noch keine DSGVO-Einträge',
    };
  }
}
