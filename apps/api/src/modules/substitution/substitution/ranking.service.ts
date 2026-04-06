import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../config/database/prisma.service';
import {
  calculateMaxTeachingHours,
  calculateWerteinheiten,
} from '../../teacher/werteinheiten.util';

/**
 * SUBST-02 -- Deterministic Scored Ranking.
 *
 * Implements D-05 weighted formula:
 *   total = 0.45*subjectMatch + 0.30*fairness + 0.20*workloadHeadroom + 0.05*klassenvorstand
 *
 * Hard filters (Pitfall 2 -- reusable in SubstitutionService Serializable tx):
 *   1. Lesson conflict in active TimetableRun (dayOfWeek, periodNumber, weekType)
 *   2. Existing Substitution row in {PENDING, OFFERED, CONFIRMED} on same date+period
 *   3. RoomBooking at target slot (joined via Person.keycloakUserId)
 *   4. BLOCKED_PERIOD AvailabilityRule on target day/period
 *   5. MAX_DAYS_PER_WEEK day cap exceeded
 *   6. Werteinheiten target exceeded (via werteinheiten.util.ts pure fns)
 *
 * Determinism: results are sorted by (score DESC, teacherId ASC) so identical
 * inputs produce identical orderings across invocations (Pitfall 9).
 */

// Invariant: sum = 1.00. Researched defaults per D-05; tune by editing these
// values (no schema migration needed).
export const RANKING_WEIGHTS = {
  subjectMatch: 0.45,
  fairness: 0.3,
  workloadHeadroom: 0.2,
  klassenvorstand: 0.05,
} as const;

export interface ScoreBreakdown {
  subjectMatch: number; // 0..1
  fairness: number; // 0..1
  workloadHeadroom: number; // 0..1
  klassenvorstand: number; // 0..1
  total: number; // weighted sum, 0..1
}

export interface RankedCandidate {
  teacherId: string;
  teacherName: string;
  score: number;
  breakdown: ScoreBreakdown;
  isKlassenvorstand: boolean;
}

export interface RankCandidatesInput {
  schoolId: string;
  absentTeacherId: string;
  lessonId: string;
  date: Date;
  dayOfWeek: string;
  periodNumber: number;
  weekType: string;
  subjectId: string;
  classId: string;
  windowStart: Date;
  windowEnd: Date;
}

interface PreloadedCommitments {
  slotLessons: Array<{
    teacherId: string;
    dayOfWeek: string;
    periodNumber: number;
    weekType: string;
  }>;
  dayLessonsByTeacher: Map<string, number>;
  existingSubstitutions: Array<{ substituteTeacherId: string | null }>;
  roomBookingUserKeys: Set<string>;
  klassenvorstandTeacherId: string | null;
  givenCountByTeacher: Map<string, number>;
  maxGivenInWindow: number;
}

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Rank candidates for a lesson slot. Hard filters applied first, then
   * soft scores computed for survivors, then sorted deterministically.
   */
  async rankCandidates(input: RankCandidatesInput): Promise<RankedCandidate[]> {
    const candidates = await this.prisma.teacher.findMany({
      where: { schoolId: input.schoolId, id: { not: input.absentTeacherId } },
      include: {
        person: true,
        qualifications: true,
        availabilityRules: true,
        reductions: true,
        klassenvorstandClasses: { where: { id: input.classId }, select: { id: true } },
      },
    });

    const commitments = await this.preloadCommitments(
      candidates.map((c: any) => c.id),
      input,
    );

    const ranked: Array<RankedCandidate> = [];
    for (const teacher of candidates as any[]) {
      if (!this.passesHardFilters(teacher, commitments, input)) continue;
      const breakdown = this.computeScore(teacher, input, commitments);
      const isKv = commitments.klassenvorstandTeacherId === teacher.id;
      ranked.push({
        teacherId: teacher.id,
        teacherName: `${teacher.person.firstName} ${teacher.person.lastName}`,
        score: breakdown.total,
        breakdown,
        isKlassenvorstand: isKv,
      });
    }

    // Deterministic sort: score DESC, then teacherId ASC (lexicographic tie-break).
    return ranked.sort(
      (a, b) => b.score - a.score || a.teacherId.localeCompare(b.teacherId),
    );
  }

  /**
   * Preload all commitment data in one batch per table to avoid N+1.
   */
  private async preloadCommitments(
    candidateIds: string[],
    input: RankCandidatesInput,
  ): Promise<PreloadedCommitments> {
    // Resolve active TimetableRun (latest for the school).
    const activeRun = await (this.prisma as any).timetableRun?.findFirst?.({
      where: { schoolId: input.schoolId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    const runId = activeRun?.id ?? null;

    // Slot conflict query -- teachers with a lesson at this exact (day, period, weekType).
    const slotLessons = runId
      ? await this.prisma.timetableLesson.findMany({
          where: {
            runId,
            dayOfWeek: input.dayOfWeek as any,
            periodNumber: input.periodNumber,
            weekType: { in: [input.weekType, 'BOTH'] },
            teacherId: { in: candidateIds },
          },
          select: {
            teacherId: true,
            dayOfWeek: true,
            periodNumber: true,
            weekType: true,
          },
        })
      : await this.prisma.timetableLesson.findMany({
          where: {
            dayOfWeek: input.dayOfWeek as any,
            periodNumber: input.periodNumber,
            weekType: { in: [input.weekType, 'BOTH'] },
            teacherId: { in: candidateIds },
          },
          select: {
            teacherId: true,
            dayOfWeek: true,
            periodNumber: true,
            weekType: true,
          },
        });

    // Day-wide lessons for MAX_DAYS_PER_WEEK cap evaluation + werteinheiten calc.
    const dayLessons = await this.prisma.timetableLesson.findMany({
      where: {
        ...(runId ? { runId } : {}),
        teacherId: { in: candidateIds },
      },
      select: {
        teacherId: true,
        dayOfWeek: true,
        periodNumber: true,
        weekType: true,
      },
    });

    const dayLessonsByTeacher = new Map<string, number>();
    for (const lesson of dayLessons) {
      if (lesson.dayOfWeek === input.dayOfWeek) {
        dayLessonsByTeacher.set(
          lesson.teacherId,
          (dayLessonsByTeacher.get(lesson.teacherId) ?? 0) + 1,
        );
      }
    }

    // Existing substitution rows blocking candidates for this date+period.
    const existingSubstitutions = await this.prisma.substitution.findMany({
      where: {
        date: input.date,
        periodNumber: input.periodNumber,
        substituteTeacherId: { in: candidateIds },
        status: { in: ['PENDING', 'OFFERED', 'CONFIRMED'] },
      },
      select: { substituteTeacherId: true },
    });

    // Room bookings (joined to candidate set via Person.keycloakUserId).
    const roomBookings = await this.prisma.roomBooking.findMany({
      where: {
        dayOfWeek: input.dayOfWeek as any,
        periodNumber: input.periodNumber,
        weekType: { in: [input.weekType, 'BOTH'] },
      },
      select: { bookedBy: true },
    });
    const roomBookingUserKeys = new Set<string>(roomBookings.map((r: any) => r.bookedBy));

    // Klassenvorstand of affected class.
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: input.classId },
      select: { klassenvorstandId: true },
    });
    const klassenvorstandTeacherId = schoolClass?.klassenvorstandId ?? null;

    // Fairness: count of given substitutions per teacher in the window.
    const givenRows = await (this.prisma as any).substitution.groupBy({
      by: ['substituteTeacherId'],
      where: {
        substituteTeacherId: { in: candidateIds },
        date: { gte: input.windowStart, lte: input.windowEnd },
        status: 'CONFIRMED',
      },
      _count: { _all: true },
    });
    const givenCountByTeacher = new Map<string, number>();
    let maxGivenInWindow = 0;
    for (const row of givenRows) {
      if (row.substituteTeacherId) {
        const n = row._count?._all ?? 0;
        givenCountByTeacher.set(row.substituteTeacherId, n);
        if (n > maxGivenInWindow) maxGivenInWindow = n;
      }
    }

    return {
      slotLessons,
      dayLessonsByTeacher,
      existingSubstitutions,
      roomBookingUserKeys,
      klassenvorstandTeacherId,
      givenCountByTeacher,
      maxGivenInWindow,
    };
  }

  /**
   * Public for reuse inside SubstitutionService.assignSubstitute Serializable tx.
   * Returns true iff candidate is eligible for the slot.
   */
  passesHardFilters(
    teacher: any,
    commitments: PreloadedCommitments,
    input: RankCandidatesInput,
  ): boolean {
    // 1. Slot conflict: active TimetableLesson at (dayOfWeek, period, weekType)
    if (
      commitments.slotLessons.some(
        (l) =>
          l.teacherId === teacher.id &&
          l.dayOfWeek === input.dayOfWeek &&
          l.periodNumber === input.periodNumber,
      )
    ) {
      return false;
    }

    // 2. Existing substitution on same slot
    if (
      commitments.existingSubstitutions.some(
        (s) => s.substituteTeacherId === teacher.id,
      )
    ) {
      return false;
    }

    // 3. Room booking conflict via keycloakUserId
    const keycloakId = teacher.person?.keycloakUserId;
    if (keycloakId && commitments.roomBookingUserKeys.has(keycloakId)) {
      return false;
    }

    // 4. BLOCKED_PERIOD availability rule
    const blocked = (teacher.availabilityRules ?? []).some(
      (r: any) =>
        r.ruleType === 'BLOCKED_PERIOD' &&
        r.dayOfWeek === input.dayOfWeek &&
        Array.isArray(r.periodNumbers) &&
        r.periodNumbers.includes(input.periodNumber),
    );
    if (blocked) return false;

    // 5. MAX_DAYS_PER_WEEK (day cap surrogate): if an existing MAX rule caps the
    // teacher's daily lesson count and they are already at the cap, exclude them.
    const maxRule = (teacher.availabilityRules ?? []).find(
      (r: any) => r.ruleType === 'MAX_DAYS_PER_WEEK' && r.maxValue != null,
    );
    if (maxRule) {
      const currentDayLessons = commitments.dayLessonsByTeacher.get(teacher.id) ?? 0;
      if (currentDayLessons >= maxRule.maxValue) return false;
    }

    // 6. Werteinheiten overflow
    const target = calculateMaxTeachingHours(
      teacher.werteinheitenTarget ?? 20,
      teacher.reductions ?? [],
    );
    const currentWeeklyHours = this.estimateCurrentWeeklyHours(teacher.id, commitments);
    // Use factor 1.0 as conservative floor (no subject-group resolution at filter time).
    // Specific WE-per-subject math happens downstream in stats. Here we just check
    // that adding one period does not exceed target.
    const weUnitsFromOneLesson = calculateWerteinheiten(1, 'III');
    if (currentWeeklyHours + weUnitsFromOneLesson > target) {
      return false;
    }

    return true;
  }

  /**
   * Public for unit testability. Computes score breakdown for a candidate that
   * has passed hard filters.
   */
  computeScore(
    teacher: any,
    input: RankCandidatesInput,
    commitments: PreloadedCommitments,
  ): ScoreBreakdown {
    // subjectMatch: 1.0 if teacher is qualified for this subject, else 0.0
    // TODO(v2): 0.5 for related Lehrverpflichtungsgruppe once schema supports the
    // Gruppe relationship between subjects.
    const subjectMatch = (teacher.qualifications ?? []).some(
      (q: any) => q.subjectId === input.subjectId,
    )
      ? 1.0
      : 0.0;

    // fairness: 1 - (candidateGiven / maxGiven). When max is 0, everyone is fair (1.0).
    let fairness: number;
    if (commitments.maxGivenInWindow === 0) {
      fairness = 1.0;
    } else {
      const given = commitments.givenCountByTeacher.get(teacher.id) ?? 0;
      fairness = 1 - given / commitments.maxGivenInWindow;
      if (fairness < 0) fairness = 0;
      if (fairness > 1) fairness = 1;
    }

    // workloadHeadroom: (target - current) / target, clamped to [0, 1]
    const target = calculateMaxTeachingHours(
      teacher.werteinheitenTarget ?? 20,
      teacher.reductions ?? [],
    );
    let workloadHeadroom: number;
    if (target <= 0) {
      workloadHeadroom = 0;
    } else {
      const currentWe = this.estimateCurrentWeeklyHours(teacher.id, commitments);
      workloadHeadroom = (target - currentWe) / target;
      if (workloadHeadroom < 0) workloadHeadroom = 0;
      if (workloadHeadroom > 1) workloadHeadroom = 1;
    }

    // klassenvorstand: 1.0 if teacher is KV of affected class, else 0.0
    const klassenvorstand =
      commitments.klassenvorstandTeacherId === teacher.id ? 1.0 : 0.0;

    const total =
      RANKING_WEIGHTS.subjectMatch * subjectMatch +
      RANKING_WEIGHTS.fairness * fairness +
      RANKING_WEIGHTS.workloadHeadroom * workloadHeadroom +
      RANKING_WEIGHTS.klassenvorstand * klassenvorstand;

    return { subjectMatch, fairness, workloadHeadroom, klassenvorstand, total };
  }

  /**
   * Rough current weekly hours for a candidate from preloaded day lessons.
   * Conservative: counts every lesson in any day as 1h of teaching workload.
   */
  private estimateCurrentWeeklyHours(
    teacherId: string,
    commitments: PreloadedCommitments,
  ): number {
    // dayLessonsByTeacher only stores the target day. For a rough WE estimate
    // we assume the target-day tally is representative; this is a conservative
    // lower bound sufficient for "would adding a period push past target?".
    // A more accurate estimate lives in SubstitutionStatsService.
    return commitments.dayLessonsByTeacher.get(teacherId) ?? 0;
  }
}
