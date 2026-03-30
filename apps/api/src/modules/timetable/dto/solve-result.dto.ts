/**
 * DTOs for solver completion result.
 * Received from the Timefold sidecar via internal callback on solve completion.
 */

import { ViolationGroupDto } from './solve-progress.dto';

export class SolvedLessonDto {
  /** Lesson ID in format classSubjectId-index */
  lessonId!: string;
  /** Assigned timeslot ID (Period.id or Period.id-A/B for A/B weeks) */
  timeslotId!: string;
  /** Assigned room ID */
  roomId!: string;
  /** Day of week extracted from the assigned timeslot */
  dayOfWeek!: string;
  /** Period number extracted from the assigned timeslot */
  periodNumber!: number;
  /** Week type: "BOTH", "A", or "B" */
  weekType!: string;
}

export class SolveResultDto {
  runId!: string;
  status!: 'COMPLETED' | 'STOPPED' | 'FAILED';
  hardScore!: number;
  softScore!: number;
  elapsedSeconds!: number;
  lessons!: SolvedLessonDto[];
  violations!: ViolationGroupDto[];
}
