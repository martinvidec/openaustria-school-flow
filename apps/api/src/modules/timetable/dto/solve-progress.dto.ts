/**
 * DTOs for solver progress updates.
 * Received from the Timefold sidecar via internal callback (D-08).
 */

export class ViolationGroupDto {
  /** Constraint type, e.g. "Teacher conflict", "Room double-booking" */
  type!: string;
  /** Number of violations of this type */
  count!: number;
  /** Human-readable examples: "Mueller: Mon P3", "Room 101: Fri P5-P6" */
  examples!: string[];
}

export class ScoreHistoryEntryDto {
  /** Milliseconds since solve start */
  timestamp!: number;
  /** Hard score (0 = no hard violations) */
  hard!: number;
  /** Soft score (higher is better, always <= 0) */
  soft!: number;
}

export class SolveProgressDto {
  runId!: string;
  hardScore!: number;
  softScore!: number;
  elapsedSeconds!: number;
  remainingViolations!: ViolationGroupDto[];
  improvementRate!: 'improving' | 'plateauing' | 'stagnant';
  scoreHistory!: ScoreHistoryEntryDto[];
}
