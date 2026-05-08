import {
  IsArray,
  IsIn,
  IsInt,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTOs for solver completion result.
 * Received from the Timefold sidecar via internal callback on solve completion.
 *
 * Decorators required because the global ValidationPipe runs with
 * `whitelist: true, forbidNonWhitelisted: true`. Without them every
 * property gets rejected as "should not exist" — see issue #58.
 */

import { ViolationGroupDto } from './solve-progress.dto';

export class SolvedLessonDto {
  /** Lesson ID in format classSubjectId-index */
  @IsString()
  lessonId!: string;

  /** Assigned timeslot ID (Period.id or Period.id-A/B for A/B weeks) */
  @IsString()
  timeslotId!: string;

  /** Assigned room ID */
  @IsString()
  roomId!: string;

  /** Day of week extracted from the assigned timeslot */
  @IsString()
  dayOfWeek!: string;

  /** Period number extracted from the assigned timeslot */
  @IsInt()
  periodNumber!: number;

  /** Week type: "BOTH", "A", or "B" */
  @IsString()
  weekType!: string;
}

export class SolveResultDto {
  @IsString()
  runId!: string;

  @IsIn(['COMPLETED', 'STOPPED', 'FAILED'])
  status!: 'COMPLETED' | 'STOPPED' | 'FAILED';

  @IsInt()
  hardScore!: number;

  @IsInt()
  softScore!: number;

  @IsInt()
  elapsedSeconds!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SolvedLessonDto)
  lessons!: SolvedLessonDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ViolationGroupDto)
  violations!: ViolationGroupDto[];
}
