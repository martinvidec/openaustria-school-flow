import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { ConstraintTemplateService } from './constraint-template.service';
import { mergeWeightOverrides } from './dto/constraint-weight.dto';

// --- Solver payload interfaces (match Timefold sidecar SchoolTimetable structure) ---

export interface SolverLesson {
  id: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  groupId: string | null;
  studentCount: number;
  preferDoublePeriod: boolean;
  requiredRoomType: string | null;
  requiredEquipment: string[];
  homeRoomId: string | null;
  weekType: 'BOTH' | 'A' | 'B';
}

export interface SolverTimeslot {
  id: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  weekType: 'BOTH' | 'A' | 'B';
  isBreak: boolean;
  nextTimeslotId: string | null;
}

export interface SolverRoom {
  id: string;
  name: string;
  roomType: string;
  capacity: number;
  equipment: string[];
}

export interface TeacherBlockedSlot {
  teacherId: string;
  dayOfWeek: string;
  periodNumber: number;
}

export interface ClassTimeslotRestriction {
  classId: string;
  maxPeriod: number;
}

export interface SubjectTimePreference {
  subjectId: string;
  latestPeriod: number;
}

/**
 * Phase 14 D-12 / D-14: SUBJECT_PREFERRED_SLOT solver fact.
 * Mirrors apps/solver/.../domain/SubjectPreferredSlot.java field names verbatim
 * (Task 0-confirmed: `subjectPreferredSlots` is the SchoolTimetable collection
 * field name; Jackson keys must match camelCase).
 */
export interface SubjectPreferredSlotInput {
  subjectId: string;
  dayOfWeek: string; // 'MONDAY' | 'TUESDAY' | ... | 'FRIDAY'
  period: number;
}

export interface SolverPayload {
  lessons: SolverLesson[];
  timeslots: SolverTimeslot[];
  rooms: SolverRoom[];
  blockedSlots: TeacherBlockedSlot[];
  classTimeslotRestrictions: ClassTimeslotRestriction[];
  subjectTimePreferences: SubjectTimePreference[];
  /** Phase 14 D-12 / D-14 — cumulative SUBJECT_PREFERRED_SLOT preferences */
  subjectPreferredSlots: SubjectPreferredSlotInput[];
  constraintWeightOverrides: Record<string, number>;
}

@Injectable()
export class SolverInputService {
  private readonly logger = new Logger(SolverInputService.name);

  constructor(
    private prisma: PrismaService,
    private constraintTemplateService: ConstraintTemplateService,
  ) {}

  /**
   * Aggregate all school data from Prisma into a solver-compatible payload.
   * This is the "scavenger hunt" -- it knows all the Prisma relations.
   * Downstream consumers just get a clean SolverPayload.
   */
  async buildSolverInput(
    schoolId: string,
    constraintWeightOverrides?: Record<string, number>,
  ): Promise<SolverPayload> {
    // 1. Load school to check abWeekEnabled
    const school = await this.prisma.school.findUniqueOrThrow({
      where: { id: schoolId },
    });

    // 2. Load active school days
    const schoolDays = await this.prisma.schoolDay.findMany({
      where: { schoolId, isActive: true },
      orderBy: { dayOfWeek: 'asc' },
    });
    const activeDays = schoolDays.map((d) => d.dayOfWeek);

    // 3. Load TimeGrid with Periods
    const timeGrid = await this.prisma.timeGrid.findUnique({
      where: { schoolId },
      include: {
        periods: { orderBy: { periodNumber: 'asc' } },
      },
    });

    if (!timeGrid) {
      throw new Error(`No time grid found for school ${schoolId}. Cannot build solver input.`);
    }

    // 4. Load Rooms
    const rooms = await this.prisma.room.findMany({
      where: { schoolId },
    });

    // 5. Load Teachers with AvailabilityRules and Reductions
    const teachers = await this.prisma.teacher.findMany({
      where: { schoolId },
      include: {
        person: true,
        availabilityRules: true,
        reductions: true,
      },
    });

    // 6. Load ClassSubjects with Subject, SchoolClass relations
    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        schoolClass: { schoolId },
      },
      include: {
        subject: true,
        schoolClass: true,
      },
    });

    // 7. Build teacher lookup for quick name resolution
    const teacherMap = new Map(
      teachers.map((t) => [t.id, t]),
    );

    // --- Transform to solver DTOs ---

    // Build timeslots
    const nonBreakPeriods = timeGrid.periods.filter((p) => !p.isBreak);
    const timeslots = this.buildTimeslots(
      nonBreakPeriods,
      activeDays,
      (school as any).abWeekEnabled ?? false,
    );

    // Build lessons from ClassSubjects
    const lessons = this.buildLessons(classSubjects, teacherMap);

    // Build rooms
    const solverRooms: SolverRoom[] = rooms.map((r) => ({
      id: r.id,
      name: r.name,
      roomType: r.roomType,
      capacity: r.capacity,
      equipment: r.equipment,
    }));

    // Build blocked slots from teacher AvailabilityRules
    const blockedSlots = this.buildBlockedSlots(teachers);

    // Process constraint templates (TIME-03 + Phase 14 D-12/D-14)
    const {
      additionalBlockedSlots,
      classTimeslotRestrictions,
      subjectTimePreferences,
      subjectPreferredSlots,
    } = await this.processConstraintTemplates(schoolId);

    // Merge blocked slots
    blockedSlots.push(...additionalBlockedSlots);

    // Merge constraint weight overrides with defaults
    const mergedWeights = mergeWeightOverrides(constraintWeightOverrides);

    this.logger.log(
      `Built solver input for school ${schoolId}: ${lessons.length} lessons, ` +
      `${timeslots.length} timeslots, ${solverRooms.length} rooms, ` +
      `${blockedSlots.length} blocked slots, ` +
      `${classTimeslotRestrictions.length} class restrictions, ` +
      `${subjectTimePreferences.length} subject morning prefs, ` +
      `${subjectPreferredSlots.length} subject preferred slots`,
    );

    return {
      lessons,
      timeslots,
      rooms: solverRooms,
      blockedSlots,
      classTimeslotRestrictions,
      subjectTimePreferences,
      subjectPreferredSlots,
      constraintWeightOverrides: mergedWeights,
    };
  }

  /**
   * Build SolverTimeslot[] from Periods and active school days.
   * If abWeekEnabled, duplicate timeslots with weekType "A" and "B".
   */
  private buildTimeslots(
    periods: Array<{ id: string; periodNumber: number; startTime: string; endTime: string; isBreak: boolean }>,
    activeDays: string[],
    abWeekEnabled: boolean,
  ): SolverTimeslot[] {
    const timeslots: SolverTimeslot[] = [];

    for (const day of activeDays) {
      for (let i = 0; i < periods.length; i++) {
        const period = periods[i];
        const nextPeriod = i + 1 < periods.length ? periods[i + 1] : null;

        // Period.id is shared across weekdays in the schema, so timeslot ids
        // must be composite (day + period) to satisfy Timefold's planningId
        // uniqueness invariant. See issue #50 Bug 2.
        if (abWeekEnabled) {
          // Duplicate for A and B weeks
          for (const weekType of ['A', 'B'] as const) {
            const suffix = `-${weekType}`;
            timeslots.push({
              id: `${day}-${period.id}${suffix}`,
              dayOfWeek: day,
              periodNumber: period.periodNumber,
              startTime: period.startTime,
              endTime: period.endTime,
              weekType,
              isBreak: period.isBreak,
              nextTimeslotId: nextPeriod ? `${day}-${nextPeriod.id}${suffix}` : null,
            });
          }
        } else {
          timeslots.push({
            id: `${day}-${period.id}`,
            dayOfWeek: day,
            periodNumber: period.periodNumber,
            startTime: period.startTime,
            endTime: period.endTime,
            weekType: 'BOTH',
            isBreak: period.isBreak,
            nextTimeslotId: nextPeriod ? `${day}-${nextPeriod.id}` : null,
          });
        }
      }
    }

    return timeslots;
  }

  /**
   * Build SolverLesson[] from ClassSubjects.
   * Each ClassSubject with weeklyHours > 0 generates N lessons (one per weekly hour).
   */
  private buildLessons(
    classSubjects: Array<{
      id: string;
      weeklyHours: number;
      preferDoublePeriod: boolean;
      groupId: string | null;
      subject: { id: string; name: string; subjectType: string; lehrverpflichtungsgruppe: string | null; werteinheitenFactor: number | null };
      schoolClass: { id: string; name: string };
    }>,
    teacherMap: Map<string, { id: string; person: { firstName: string; lastName: string } }>,
  ): SolverLesson[] {
    const lessons: SolverLesson[] = [];

    for (const cs of classSubjects) {
      if (cs.weeklyHours <= 0) continue;

      // Look up subject's requiredRoomType from subject model
      // Note: Subject doesn't have requiredRoomType in schema yet -- use null for now
      const requiredRoomType: string | null = null;

      // Resolve teacher name
      // Note: ClassSubject doesn't have a direct teacherId in the schema
      // The teacher assignment comes from TeacherSubject qualifications
      // For solver purposes, we need a teacher assigned per ClassSubject
      // This will be resolved when ClassSubject gets a teacherId field
      const teacherName = 'Unassigned';
      const teacherId = '';

      for (let i = 0; i < cs.weeklyHours; i++) {
        lessons.push({
          id: `${cs.id}-${i}`,
          subjectId: cs.subject.id,
          subjectName: cs.subject.name,
          teacherId,
          teacherName,
          classId: cs.schoolClass.id,
          className: cs.schoolClass.name,
          groupId: cs.groupId,
          studentCount: 0, // derived from class size if needed
          preferDoublePeriod: cs.preferDoublePeriod,
          requiredRoomType,
          requiredEquipment: [],
          homeRoomId: null,
          weekType: 'BOTH',
        });
      }
    }

    return lessons;
  }

  /**
   * Build TeacherBlockedSlot[] from AvailabilityRules.
   * BLOCKED_PERIOD and BLOCKED_DAY_PART rules create blocked slot entries.
   */
  private buildBlockedSlots(
    teachers: Array<{
      id: string;
      availabilityRules: Array<{
        id: string;
        ruleType: string;
        dayOfWeek: string | null;
        periodNumbers: number[];
        maxValue: number | null;
        dayPart: string | null;
      }>;
    }>,
  ): TeacherBlockedSlot[] {
    const blockedSlots: TeacherBlockedSlot[] = [];

    for (const teacher of teachers) {
      for (const rule of teacher.availabilityRules) {
        if (rule.ruleType === 'BLOCKED_PERIOD' && rule.dayOfWeek) {
          // Each period number in the array is a blocked slot
          for (const periodNumber of rule.periodNumbers) {
            blockedSlots.push({
              teacherId: teacher.id,
              dayOfWeek: rule.dayOfWeek,
              periodNumber,
            });
          }
        } else if (rule.ruleType === 'BLOCKED_DAY_PART' && rule.dayOfWeek) {
          // Expand day part range to individual period entries
          for (const periodNumber of rule.periodNumbers) {
            blockedSlots.push({
              teacherId: teacher.id,
              dayOfWeek: rule.dayOfWeek,
              periodNumber,
            });
          }
        }
      }
    }

    return blockedSlots;
  }

  /**
   * Process active ConstraintTemplates into solver constructs.
   *
   * Phase 14 D-14 dedupe semantics:
   *   - NO_LESSONS_AFTER: group by classId, keep min(maxPeriod) — strictest wins
   *   - SUBJECT_MORNING:  group by subjectId, keep min(latestPeriod) — strictest wins
   *   - SUBJECT_PREFERRED_SLOT: ALL entries kept (cumulative reward semantics)
   *   - BLOCK_TIMESLOT: ALL entries kept (additive blocked-slot semantics)
   *
   * Phase 14 D-12: SUBJECT_PREFERRED_SLOT was previously silently dropped (no
   * case in the switch). This now produces a fourth output list so the Java
   * sidecar's new `subjectPreferredSlot` constraint stream (Task 5) can
   * actually score it.
   */
  async processConstraintTemplates(schoolId: string): Promise<{
    additionalBlockedSlots: TeacherBlockedSlot[];
    classTimeslotRestrictions: ClassTimeslotRestriction[];
    subjectTimePreferences: SubjectTimePreference[];
    subjectPreferredSlots: SubjectPreferredSlotInput[];
  }> {
    const templates = await this.constraintTemplateService.findActive(schoolId);

    const additionalBlockedSlots: TeacherBlockedSlot[] = [];
    const classTimeslotRestrictionsRaw: ClassTimeslotRestriction[] = [];
    const subjectTimePreferencesRaw: SubjectTimePreference[] = [];
    const subjectPreferredSlotsRaw: SubjectPreferredSlotInput[] = [];

    for (const template of templates) {
      const params = template.params as Record<string, any>;

      switch (template.templateType) {
        case 'BLOCK_TIMESLOT': {
          // params: { teacherId, dayOfWeek, periods: number[] }
          const periods: number[] = params.periods ?? params.periodNumbers ?? [];
          for (const pn of periods) {
            additionalBlockedSlots.push({
              teacherId: params.teacherId,
              dayOfWeek: params.dayOfWeek,
              periodNumber: pn,
            });
          }
          break;
        }

        case 'NO_LESSONS_AFTER': {
          // params: { classId, maxPeriod }
          classTimeslotRestrictionsRaw.push({
            classId: params.classId,
            maxPeriod: params.maxPeriod,
          });
          break;
        }

        case 'SUBJECT_MORNING': {
          // params: { subjectId, latestPeriod (or maxPeriod legacy) }
          subjectTimePreferencesRaw.push({
            subjectId: params.subjectId,
            latestPeriod: params.latestPeriod ?? params.maxPeriod,
          });
          break;
        }

        case 'SUBJECT_PREFERRED_SLOT': {
          // params: { subjectId, dayOfWeek, period }
          subjectPreferredSlotsRaw.push({
            subjectId: params.subjectId,
            dayOfWeek: params.dayOfWeek,
            period: params.period,
          });
          break;
        }

        default:
          this.logger.warn(
            `Unknown constraint template type: ${template.templateType} (id: ${template.id})`,
          );
      }
    }

    // Phase 14 D-14 dedupe: NO_LESSONS_AFTER per classId, keep min(maxPeriod)
    const classRestrictionsByClassId = new Map<string, ClassTimeslotRestriction>();
    for (const r of classTimeslotRestrictionsRaw) {
      const existing = classRestrictionsByClassId.get(r.classId);
      if (!existing || r.maxPeriod < existing.maxPeriod) {
        classRestrictionsByClassId.set(r.classId, r);
      }
    }
    const classTimeslotRestrictions = Array.from(classRestrictionsByClassId.values());

    // Phase 14 D-14 dedupe: SUBJECT_MORNING per subjectId, keep min(latestPeriod)
    const subjectPreferencesBySubjectId = new Map<string, SubjectTimePreference>();
    for (const p of subjectTimePreferencesRaw) {
      const existing = subjectPreferencesBySubjectId.get(p.subjectId);
      if (!existing || p.latestPeriod < existing.latestPeriod) {
        subjectPreferencesBySubjectId.set(p.subjectId, p);
      }
    }
    const subjectTimePreferences = Array.from(subjectPreferencesBySubjectId.values());

    // SUBJECT_PREFERRED_SLOT: cumulative (no dedupe) per D-14
    const subjectPreferredSlots = subjectPreferredSlotsRaw;

    return {
      additionalBlockedSlots,
      classTimeslotRestrictions,
      subjectTimePreferences,
      subjectPreferredSlots,
    };
  }
}
