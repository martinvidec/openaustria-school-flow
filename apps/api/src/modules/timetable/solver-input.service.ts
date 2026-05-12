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

    // 6. Load ClassSubjects with Subject, SchoolClass + assigned Teacher.
    //    Issue #71: include teacher.person so the solver-input lesson DTO
    //    can carry a real teacherId AND a human-readable teacherName.
    //    Issue #72: cycleLength + cycleSlotMask are scalar fields so they
    //    travel with the select-* implicit by default.
    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        schoolClass: { schoolId },
      },
      include: {
        subject: true,
        schoolClass: true,
        teacher: { include: { person: true } },
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

    // Build lessons from ClassSubjects. Issue #72: lesson expansion is
    // week-rhythm aware — every ClassSubject row generates N×K lessons
    // where N = weeklyHours and K = number of active cycle slots
    // (typically 1 for cycleLength=1; 2 for cycleLength=2+mask=BOTH on an
    // A/B school).
    const lessons = this.buildLessons(
      classSubjects,
      teacherMap,
      (school as any).abWeekEnabled ?? false,
    );

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
      teacherId: string | null;
      teacher: { id: string; person: { firstName: string; lastName: string } } | null;
      cycleLength: number;
      cycleSlotMask: number | null;
      subject: { id: string; name: string; subjectType: string; lehrverpflichtungsgruppe: string | null; werteinheitenFactor: number | null; requiredRoomType: string | null };
      schoolClass: { id: string; name: string; homeRoomId: string | null };
    }>,
    _teacherMap: Map<string, { id: string; person: { firstName: string; lastName: string } }>,
    abWeekEnabled: boolean,
  ): SolverLesson[] {
    const lessons: SolverLesson[] = [];

    for (const cs of classSubjects) {
      if (cs.weeklyHours <= 0) continue;

      // Issue #69: pass the subject's requiredRoomType through to the Java
      // roomTypeRequirement constraint. null = no requirement, solver
      // picks freely (the pre-#69 default for every lesson).
      const requiredRoomType: string | null = cs.subject.requiredRoomType;

      // Issue #71: read the assignment off the ClassSubject row instead of
      // hardcoding ''. teacherId='' is what historically broke both
      // teacherConflict and teacherAvailability hard constraints (the join
      // on TeacherAvailability.teacherId never matched). When the
      // assignment is null we still send '', which keeps the lesson
      // schedulable but unconstrained — the same fallback behaviour the
      // pre-#71 code shipped, isolated to genuinely unassigned subjects.
      const teacherId = cs.teacherId ?? '';
      const teacherName = cs.teacher
        ? `${cs.teacher.person.lastName} ${cs.teacher.person.firstName}`
        : 'Unassigned';

      // Issue #72: derive the lesson weekTypes from the rhythm fields.
      // For non-A/B schools the rhythm flag collapses to a single BOTH
      // entry; for A/B schools cycleLength=2+mask=1 → ['A'], mask=2 →
      // ['B'], cycleLength=1 (every week) → ['A','B'] so the lesson
      // exists in each week separately. n>2 cycles are accepted by the
      // schema for forward-compat but the API today only validates the
      // A/B subset (see UpdateClassSubjectsDto Issue #72 fields).
      const weekTypes = this.deriveLessonWeekTypes(
        cs.cycleLength,
        cs.cycleSlotMask,
        abWeekEnabled,
      );

      for (let i = 0; i < cs.weeklyHours; i++) {
        for (const weekType of weekTypes) {
          lessons.push({
            id: `${cs.id}-${i}-${weekType}`,
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
            // Issue #67: pass the class's home room through so the Java
            // homeRoomPreference soft constraint can fire. null falls back
            // to the pre-#67 behavior (no preference, solver minimizes other
            // constraints freely).
            homeRoomId: cs.schoolClass.homeRoomId,
            weekType,
          });
        }
      }
    }

    return lessons;
  }

  /**
   * Issue #72: map ClassSubject rhythm (cycleLength + cycleSlotMask) to
   * the list of lesson weekTypes the solver needs to schedule. Every
   * weekly hour of a ClassSubject is expanded once per returned weekType,
   * so a "BOTH" subject on an A/B school yields 2× lessons (one A, one
   * B) — those are independently scheduled by the solver but constrained
   * to land in the matching timeslot via the new weekTypeCompatibility
   * Java constraint.
   *
   *   - cycleLength <= 1 OR mask null OR mask covers every cycle slot
   *     → every-week behaviour. abWeekEnabled=true splits into A+B;
   *       abWeekEnabled=false collapses to a single BOTH lesson.
   *   - cycleLength == 2, mask == 0b01 → A-week only.
   *   - cycleLength == 2, mask == 0b10 → B-week only.
   *   - cycleLength > 2 → forward-compat fallback to every-week (no UI yet).
   */
  private deriveLessonWeekTypes(
    cycleLength: number,
    cycleSlotMask: number | null,
    abWeekEnabled: boolean,
  ): Array<'BOTH' | 'A' | 'B'> {
    // Default / "every week"
    if (cycleLength <= 1 || cycleSlotMask == null) {
      return abWeekEnabled ? ['A', 'B'] : ['BOTH'];
    }
    if (cycleLength === 2) {
      const aActive = (cycleSlotMask & 0b01) !== 0;
      const bActive = (cycleSlotMask & 0b10) !== 0;
      if (aActive && bActive) {
        return abWeekEnabled ? ['A', 'B'] : ['BOTH'];
      }
      if (aActive) return ['A'];
      if (bActive) return ['B'];
      // mask=0 — should have been rejected by the service validator, but
      // fall back to every-week rather than emitting zero lessons.
      return abWeekEnabled ? ['A', 'B'] : ['BOTH'];
    }
    // n>2 cycles not yet emitted by the API; expand as every-week so
    // unknown rhythms never silently drop subjects from the plan.
    return abWeekEnabled ? ['A', 'B'] : ['BOTH'];
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
