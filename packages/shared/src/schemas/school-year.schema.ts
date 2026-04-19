import { z } from 'zod';

/**
 * Accepts a Date instance OR an ISO-8601 date string (coerced to Date).
 * The RHF integration on the web side sends Date objects; API DTOs over JSON
 * transmit strings — coercion keeps both call sites happy.
 */
const isoDate = z.coerce.date();

/**
 * SchoolYearSchema: Schuljahr create/update validation per UI-SPEC §5-6.
 * superRefine asserts the ordering invariants:
 *   startDate < semesterBreak < endDate.
 * Error messages are user-facing German copy (UI-SPEC §13.4).
 */
export const SchoolYearSchema = z
  .object({
    name: z.string().min(1, 'Name erforderlich'),
    startDate: isoDate,
    semesterBreak: isoDate,
    endDate: isoDate,
    isActive: z.boolean().optional().default(false),
  })
  .superRefine((y, ctx) => {
    if (y.startDate >= y.endDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ende muss nach Start liegen',
        path: ['endDate'],
      });
    }
    if (y.semesterBreak <= y.startDate || y.semesterBreak >= y.endDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'Semesterwechsel muss zwischen Start und Ende liegen',
        path: ['semesterBreak'],
      });
    }
  });

export type SchoolYearInput = z.infer<typeof SchoolYearSchema>;
