import { z } from 'zod';

/**
 * HH:MM 24-hour time format. Leading zero required (UI-SPEC §4.6).
 */
export const TIME_REGEX = /^\d{2}:\d{2}$/;

/**
 * Monday-through-Saturday school-day vocabulary (SATURDAY permitted per DACH
 * school calendar — e.g. Gymnasium half-day Saturdays). Sunday intentionally
 * excluded.
 */
export const SCHOOL_DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

export const SchoolDayEnum = z.enum(SCHOOL_DAYS);
export type SchoolDay = z.infer<typeof SchoolDayEnum>;

/**
 * Single period in a school day (Unterrichtsstunde or Pause).
 * All error messages are user-facing German copy (UI-SPEC §13.4).
 */
export const PeriodSchema = z
  .object({
    periodNumber: z.number().int().positive(),
    label: z.string().optional(),
    startTime: z.string().regex(TIME_REGEX, 'HH:MM erwartet'),
    endTime: z.string().regex(TIME_REGEX, 'HH:MM erwartet'),
    isBreak: z.boolean(),
  })
  .refine((p) => p.endTime > p.startTime, {
    message: 'Ende muss nach Start liegen',
    path: ['endTime'],
  });

export type PeriodInput = z.infer<typeof PeriodSchema>;

/**
 * TimeGridSchema: full Zeitraster for one school per UI-SPEC §4.
 * superRefine enforces cross-period invariants: overlap-free and unique
 * period numbers. Pair this Zod validation with the backend class-validator
 * DTOs (CONTEXT.md D-15 defense-in-depth).
 */
export const TimeGridSchema = z
  .object({
    periods: z.array(PeriodSchema).min(1, 'Mindestens eine Periode erforderlich'),
    schoolDays: z
      .array(SchoolDayEnum)
      .min(1, 'Mindestens ein Unterrichtstag erforderlich'),
  })
  .superRefine((tg, ctx) => {
    const sorted = [...tg.periods].sort(
      (a, b) => a.periodNumber - b.periodNumber,
    );
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i - 1].endTime > sorted[i].startTime) {
        ctx.addIssue({
          code: 'custom',
          message: 'Perioden duerfen sich nicht ueberlappen',
          path: ['periods', i, 'startTime'],
        });
      }
    }
    const numbers = tg.periods.map((p) => p.periodNumber);
    const dupes = numbers.filter((n, i) => numbers.indexOf(n) !== i);
    if (dupes.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Doppelte Periodennummer',
        path: ['periods'],
      });
    }
  });

export type TimeGridInput = z.infer<typeof TimeGridSchema>;
