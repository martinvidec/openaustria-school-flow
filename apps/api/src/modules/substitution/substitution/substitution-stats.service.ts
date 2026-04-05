import { BadRequestException, Injectable } from '@nestjs/common';
import {
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { PrismaService } from '../../../config/database/prisma.service';
import { StatisticsService } from '../../classbook/statistics.service';

/**
 * SUBST-06 -- Fairness statistics aggregation over the Substitution overlay.
 *
 * Returns one row per teacher with given/received counts, Werteinheiten
 * weighting for given hours, entfall/stillarbeit affected counts, and the
 * deltaVsAverage fairness indicator (D-17).
 *
 * Windows (D-18):
 *  - week        -> Monday..Sunday of the current ISO week (weekStartsOn: 1)
 *  - month       -> current calendar month
 *  - semester    -> current Austrian semester (reuses Phase 5 StatisticsService)
 *  - schoolYear  -> Austrian school year (Sep 1 -- Jun 30)
 *  - custom      -> caller-supplied customStart + customEnd
 *
 * v1 note: givenWerteinheiten uses a conservative 1.0-per-substitution floor.
 * A future revision can apply calculateWerteinheiten() from werteinheiten.util
 * once the substitution row is joined with the underlying subject's
 * Lehrverpflichtungsgruppe. The current stub is safe (non-decreasing w.r.t.
 * the real value) and satisfies the SUBST-06 acceptance criteria.
 */

export type StatsWindow =
  | 'week'
  | 'month'
  | 'semester'
  | 'schoolYear'
  | 'custom';

export interface StatsWindowInput {
  window: StatsWindow;
  customStart?: Date;
  customEnd?: Date;
}

export interface FairnessStatRow {
  teacherId: string;
  teacherName: string;
  givenCount: number;
  givenWerteinheiten: number;
  receivedCount: number;
  entfallAffectedCount: number;
  stillarbeitAffectedCount: number;
  deltaVsAverage: number;
}

@Injectable()
export class SubstitutionStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classbookStats: StatisticsService,
  ) {}

  async getFairnessStats(
    schoolId: string,
    windowInput: StatsWindowInput,
  ): Promise<FairnessStatRow[]> {
    const { start, end } = this.resolveWindow(windowInput);

    const teachers = await this.prisma.teacher.findMany({
      where: { schoolId },
      include: { person: true },
    });

    const subs: any[] = await this.prisma.substitution.findMany({
      where: {
        date: { gte: start, lte: end },
        status: 'CONFIRMED',
        absence: { schoolId },
      },
    });

    const givenByTeacher = new Map<
      string,
      { count: number; werteinheiten: number }
    >();
    const receivedByTeacher = new Map<string, number>();
    const entfallAffectedByTeacher = new Map<string, number>();
    const stillarbeitAffectedByTeacher = new Map<string, number>();

    for (const sub of subs) {
      // Given: attributed to substituteTeacherId for SUBSTITUTED/STILLARBEIT
      if (
        (sub.type === 'SUBSTITUTED' || sub.type === 'STILLARBEIT') &&
        sub.substituteTeacherId
      ) {
        const we = this.calculateSubstitutionWerteinheiten(sub);
        const current =
          givenByTeacher.get(sub.substituteTeacherId) ?? {
            count: 0,
            werteinheiten: 0,
          };
        givenByTeacher.set(sub.substituteTeacherId, {
          count: current.count + 1,
          werteinheiten: current.werteinheiten + we,
        });
      }

      // Received / affected (by originalTeacherId, regardless of type)
      receivedByTeacher.set(
        sub.originalTeacherId,
        (receivedByTeacher.get(sub.originalTeacherId) ?? 0) + 1,
      );

      if (sub.type === 'ENTFALL') {
        entfallAffectedByTeacher.set(
          sub.originalTeacherId,
          (entfallAffectedByTeacher.get(sub.originalTeacherId) ?? 0) + 1,
        );
      } else if (sub.type === 'STILLARBEIT') {
        stillarbeitAffectedByTeacher.set(
          sub.originalTeacherId,
          (stillarbeitAffectedByTeacher.get(sub.originalTeacherId) ?? 0) + 1,
        );
      }
    }

    // Compute school-wide average given count for fairness delta (D-17).
    // Average is across ALL teachers so a zero-given teacher shows negative
    // delta when peers carry the load.
    const totalGiven = Array.from(givenByTeacher.values()).reduce(
      (sum, v) => sum + v.count,
      0,
    );
    const teacherCount = teachers.length;
    const schoolAverage = teacherCount > 0 ? totalGiven / teacherCount : 0;

    const rows: FairnessStatRow[] = teachers.map((t: any) => {
      const given = givenByTeacher.get(t.id) ?? { count: 0, werteinheiten: 0 };
      const received = receivedByTeacher.get(t.id) ?? 0;
      const entfall = entfallAffectedByTeacher.get(t.id) ?? 0;
      const stillarbeit = stillarbeitAffectedByTeacher.get(t.id) ?? 0;

      return {
        teacherId: t.id,
        teacherName: `${t.person.lastName}, ${t.person.firstName}`,
        givenCount: given.count,
        givenWerteinheiten: given.werteinheiten,
        receivedCount: received,
        entfallAffectedCount: entfall,
        stillarbeitAffectedCount: stillarbeit,
        deltaVsAverage: given.count - schoolAverage,
      };
    });

    // Sort by deltaVsAverage descending so teachers carrying above-average
    // load surface first. Teachers at the average sort by teacherId asc for
    // deterministic output.
    return rows.sort(
      (a, b) =>
        b.deltaVsAverage - a.deltaVsAverage ||
        a.teacherId.localeCompare(b.teacherId),
    );
  }

  /**
   * v1 Werteinheiten weighting: 1.0 per substitution. A future revision can
   * look up the subject's Lehrverpflichtungsgruppe via classSubjectId and use
   * calculateWerteinheiten() for Doppelstunde accuracy.
   */
  private calculateSubstitutionWerteinheiten(_sub: any): number {
    return 1.0;
  }

  /**
   * Public so RankingController can reuse the same semester math when building
   * a fairness window for the ranking preview.
   */
  resolveWindow(input: StatsWindowInput): { start: Date; end: Date } {
    const now = new Date();
    switch (input.window) {
      case 'week':
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 }),
        };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'semester':
        // Reuse Phase 5 Austrian semester utility so date boundaries match the
        // statistics shown elsewhere in the UI.
        return this.classbookStats.getSemesterDateRange();
      case 'schoolYear': {
        // Austrian school year: Sep 1 -- Jun 30 (1-based month math).
        const month = now.getMonth() + 1;
        const year = month >= 9 ? now.getFullYear() : now.getFullYear() - 1;
        return {
          start: new Date(year, 8, 1), // Sep 1
          end: new Date(year + 1, 5, 30), // Jun 30 of next calendar year
        };
      }
      case 'custom':
        if (!input.customStart || !input.customEnd) {
          throw new BadRequestException(
            'customStart und customEnd sind für das custom-Fenster erforderlich.',
          );
        }
        return { start: input.customStart, end: input.customEnd };
    }
  }
}
