/**
 * STUB — fleshed out in Task 3.
 *
 * Renders an amber InfoBanner when constraint-weights `lastUpdatedAt` is
 * newer than the latest TimetableRun.completedAt (admin changed weights
 * after the last solve, so a re-run is required to verify the effect).
 *
 * Plan 14-01 GET /constraint-weights returns `{ weights, lastUpdatedAt }`
 * — consumed directly here (no fallback path).
 */
interface Props {
  schoolId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DriftBanner(_: Props) {
  return null;
}
