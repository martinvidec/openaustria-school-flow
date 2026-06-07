import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { ViolationGroupDto } from './dto/solve-progress.dto';

export type FeasibilitySeverity = 'error' | 'warning';

export interface FeasibilityWarning {
  type: string;
  severity: FeasibilitySeverity;
  message: string;
}

export interface FeasibilityReport {
  feasible: boolean;
  gridSlots: number;
  totalLessons: number;
  roomCount: number;
  classCount: number;
  teacherCount: number;
  warnings: FeasibilityWarning[];
}

const TOP_CONSTRAINTS = 5;

/**
 * Issue #177-D — solver diagnostics.
 *
 * `getFeasibility` is a pre-solve sanity check: it compares the demanded weekly
 * lesson hours against the capacity of the time grid / teachers / rooms and
 * surfaces over-dimensioning BEFORE a (long) solve is started. It never claims
 * infeasible on a packing technicality — every `error` it raises is a genuine
 * necessary-condition violation (demand strictly exceeds an upper bound), so
 * teacher availability rules are deliberately ignored (they can only reduce
 * capacity further, never create a false alarm).
 *
 * `getReport` is a post-run overview: teacher/room utilization, per-class
 * lesson distribution, and the hardest remaining constraints.
 */
@Injectable()
export class TimetableDiagnosticsService {
  constructor(private prisma: PrismaService) {}

  /** Number of schedulable slots = active days × non-break periods. */
  private async gridSlots(schoolId: string): Promise<number> {
    const [days, periods] = await Promise.all([
      this.prisma.schoolDay.count({ where: { schoolId, isActive: true } }),
      this.prisma.period.count({
        where: { timeGrid: { schoolId }, isBreak: false },
      }),
    ]);
    return days * periods;
  }

  async getFeasibility(schoolId: string): Promise<FeasibilityReport> {
    const [gridSlots, classSubjects, roomGroups] = await Promise.all([
      this.gridSlots(schoolId),
      this.prisma.classSubject.findMany({
        where: { schoolClass: { schoolId } },
        select: {
          weeklyHours: true,
          teacherId: true,
          classId: true,
          // #186: groupId distinguishes parallel group lessons (which share a
          // slot) from whole-class lessons (which do not).
          groupId: true,
          schoolClass: { select: { name: true } },
          teacher: {
            select: { person: { select: { lastName: true } } },
          },
          subject: { select: { requiredRoomType: true } },
        },
      }),
      this.prisma.room.groupBy({
        by: ['roomType'],
        where: { schoolId },
        _count: { _all: true },
      }),
    ]);

    const roomCount = roomGroups.reduce((sum, g) => sum + g._count._all, 0);
    const roomsByType = new Map(
      roomGroups.map((g) => [g.roomType as string, g._count._all]),
    );

    const totalLessons = classSubjects.reduce(
      (sum, cs) => sum + cs.weeklyHours,
      0,
    );

    const warnings: FeasibilityWarning[] = [];

    if (gridSlots === 0) {
      warnings.push({
        type: 'NO_GRID',
        severity: 'error',
        message:
          'Kein Zeitraster: Es sind keine Unterrichtstage oder Perioden definiert.',
      });
    }
    if (roomCount === 0) {
      warnings.push({
        type: 'NO_ROOMS',
        severity: 'error',
        message: 'Keine Räume angelegt — der Solver kann keinen Plan erzeugen.',
      });
    }

    // Per-class capacity: a class can hold at most one lesson per slot, BUT
    // parallel group lessons (disjoint student sets — e.g. two language groups
    // or kath./evang. Religion) share a slot. #186: the sound, false-alarm-free
    // lower bound on the slots a class needs is therefore
    //   whole-class hours  +  hours of the single busiest group
    // — the busiest group's lessons run sequentially AND are mutually exclusive
    // with the whole-class lessons for those students, so this sum is always
    // ≤ the true minimum; other groups run in parallel and do not raise it.
    // Summing ALL weeklyHours (the pre-#186 behaviour) double-counts parallel
    // groups and raised a false CLASS_OVERLOADED on group-split classes.
    const classNames = new Map<string, string>();
    const wholeClassHours = new Map<string, number>();
    const groupHoursByClass = new Map<string, Map<string, number>>();
    for (const cs of classSubjects) {
      classNames.set(cs.classId, cs.schoolClass?.name ?? cs.classId);
      if (!cs.groupId) {
        wholeClassHours.set(
          cs.classId,
          (wholeClassHours.get(cs.classId) ?? 0) + cs.weeklyHours,
        );
      } else {
        let groups = groupHoursByClass.get(cs.classId);
        if (!groups) {
          groups = new Map();
          groupHoursByClass.set(cs.classId, groups);
        }
        groups.set(cs.groupId, (groups.get(cs.groupId) ?? 0) + cs.weeklyHours);
      }
    }
    if (gridSlots > 0) {
      for (const [classId, name] of classNames) {
        const whole = wholeClassHours.get(classId) ?? 0;
        const groups = groupHoursByClass.get(classId);
        const busiestGroup = groups ? Math.max(0, ...groups.values()) : 0;
        const demand = whole + busiestGroup;
        if (demand > gridSlots) {
          warnings.push({
            type: 'CLASS_OVERLOADED',
            severity: 'error',
            message: `Klasse ${name}: ${demand} Wochenstunden (parallele Gruppen berücksichtigt), aber nur ${gridSlots} Slots verfügbar.`,
          });
        }
      }
    }

    // Per-teacher capacity: a teacher can teach at most one lesson per slot.
    const hoursByTeacher = new Map<string, { label: string; hours: number }>();
    let unassignedHours = 0;
    for (const cs of classSubjects) {
      if (!cs.teacherId) {
        unassignedHours += cs.weeklyHours;
        continue;
      }
      const entry = hoursByTeacher.get(cs.teacherId) ?? {
        label: cs.teacher?.person?.lastName ?? cs.teacherId,
        hours: 0,
      };
      entry.hours += cs.weeklyHours;
      hoursByTeacher.set(cs.teacherId, entry);
    }
    if (gridSlots > 0) {
      for (const { label, hours } of hoursByTeacher.values()) {
        if (hours > gridSlots) {
          warnings.push({
            type: 'TEACHER_OVERLOADED',
            severity: 'error',
            message: `Lehrer ${label}: ${hours} Stunden zugewiesen, aber nur ${gridSlots} Slots verfügbar.`,
          });
        }
      }
    }
    if (unassignedHours > 0) {
      warnings.push({
        type: 'UNASSIGNED_TEACHER',
        severity: 'warning',
        message: `${unassignedHours} Wochenstunden ohne zugewiesenen Lehrer — diese Lektionen können nicht zuverlässig geplant werden.`,
      });
    }

    // Room capacity: every lesson needs a room-slot.
    if (gridSlots > 0 && roomCount > 0 && totalLessons > roomCount * gridSlots) {
      warnings.push({
        type: 'ROOM_CAPACITY',
        severity: 'error',
        message: `Zu wenige Räume: ${totalLessons} Lektionen, aber nur ${roomCount} × ${gridSlots} = ${
          roomCount * gridSlots
        } Raum-Slots.`,
      });
    }

    // Special-room-type capacity.
    if (gridSlots > 0) {
      const demandByType = new Map<string, number>();
      for (const cs of classSubjects) {
        const t = cs.subject?.requiredRoomType;
        if (t) demandByType.set(t, (demandByType.get(t) ?? 0) + cs.weeklyHours);
      }
      for (const [type, demand] of demandByType) {
        const supply = (roomsByType.get(type) ?? 0) * gridSlots;
        if (demand > supply) {
          warnings.push({
            type: 'ROOM_TYPE_CAPACITY',
            severity: 'error',
            message: `Zu wenige Räume vom Typ ${type}: ${demand} Lektionen benötigen ihn, aber nur ${supply} passende Raum-Slots.`,
          });
        }
      }
    }

    return {
      feasible: warnings.every((w) => w.severity !== 'error'),
      gridSlots,
      totalLessons,
      roomCount,
      classCount: classNames.size,
      teacherCount: hoursByTeacher.size,
      warnings,
    };
  }

  /**
   * Post-run overview for a single run: teacher/room utilization, per-class
   * lesson distribution, and the hardest remaining constraints.
   */
  async getReport(runId: string) {
    const run = await this.prisma.timetableRun.findUniqueOrThrow({
      where: { id: runId },
      select: {
        id: true,
        schoolId: true,
        status: true,
        hardScore: true,
        softScore: true,
        violations: true,
        lessons: {
          select: {
            teacherId: true,
            roomId: true,
            classSubjectId: true,
          },
        },
      },
    });

    const gridSlots = await this.gridSlots(run.schoolId);
    const lessons = run.lessons;

    // Resolve display labels for the ids referenced by the lessons.
    const teacherIds = Array.from(
      new Set(lessons.map((l) => l.teacherId).filter((id) => id)),
    );
    const roomIds = Array.from(new Set(lessons.map((l) => l.roomId)));
    const csIds = Array.from(new Set(lessons.map((l) => l.classSubjectId)));

    const [teachers, rooms, classSubjects] = await Promise.all([
      this.prisma.teacher.findMany({
        where: { id: { in: teacherIds } },
        select: { id: true, person: { select: { lastName: true } } },
      }),
      this.prisma.room.findMany({
        where: { id: { in: roomIds } },
        select: { id: true, name: true },
      }),
      this.prisma.classSubject.findMany({
        where: { id: { in: csIds } },
        select: {
          id: true,
          classId: true,
          schoolClass: { select: { name: true } },
        },
      }),
    ]);
    const teacherLabel = new Map(
      teachers.map((t) => [t.id, t.person?.lastName ?? t.id]),
    );
    const roomLabel = new Map(rooms.map((r) => [r.id, r.name]));
    const csClass = new Map(
      classSubjects.map((cs) => [
        cs.id,
        { classId: cs.classId, name: cs.schoolClass?.name ?? cs.classId },
      ]),
    );

    const countBy = <K>(
      keyOf: (l: (typeof lessons)[number]) => K | null,
    ): Map<K, number> => {
      const m = new Map<K, number>();
      for (const l of lessons) {
        const k = keyOf(l);
        if (k === null) continue;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return m;
    };

    const pct = (n: number) =>
      gridSlots > 0 ? Math.round((n / gridSlots) * 100) : 0;

    const teacherUtilization = Array.from(
      countBy((l) => (l.teacherId ? l.teacherId : null)).entries(),
    )
      .map(([id, count]) => ({
        teacherId: id,
        label: teacherLabel.get(id) ?? id,
        lessons: count,
        pct: pct(count),
      }))
      .sort((a, b) => b.lessons - a.lessons);

    const roomUtilization = Array.from(countBy((l) => l.roomId).entries())
      .map(([id, count]) => ({
        roomId: id,
        label: roomLabel.get(id) ?? id,
        lessons: count,
        pct: pct(count),
      }))
      .sort((a, b) => b.lessons - a.lessons);

    const classCounts = new Map<string, { label: string; lessons: number }>();
    for (const l of lessons) {
      const c = csClass.get(l.classSubjectId);
      if (!c) continue;
      const entry = classCounts.get(c.classId) ?? { label: c.name, lessons: 0 };
      entry.lessons += 1;
      classCounts.set(c.classId, entry);
    }
    const classDistribution = Array.from(classCounts.entries())
      .map(([classId, v]) => ({ classId, label: v.label, lessons: v.lessons }))
      .sort((a, b) => b.lessons - a.lessons);

    const violations = Array.isArray(run.violations)
      ? (run.violations as unknown as ViolationGroupDto[])
      : [];
    const topConstraints = [...violations]
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .slice(0, TOP_CONSTRAINTS)
      .map((v) => ({ type: v.type, count: v.count }));

    return {
      runId: run.id,
      status: run.status,
      hardScore: run.hardScore,
      softScore: run.softScore,
      gridSlots,
      lessonCount: lessons.length,
      teacherUtilization,
      roomUtilization,
      classDistribution,
      topConstraints,
    };
  }
}
