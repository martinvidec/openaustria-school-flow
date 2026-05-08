import {
  IsArray,
  IsIn,
  IsInt,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTOs for solver progress updates.
 * Received from the Timefold sidecar via internal callback (D-08).
 *
 * class-validator decorators are required because the global
 * ValidationPipe runs with `whitelist: true, forbidNonWhitelisted: true`
 * — without them every property is rejected as "should not exist" and
 * the sidecar's HTTP/1.1 callback gets a 422. Issue #58.
 */

export class ViolationGroupDto {
  /** Constraint type, e.g. "Teacher conflict", "Room double-booking" */
  @IsString()
  type!: string;

  /** Number of violations of this type */
  @IsInt()
  count!: number;

  /** Human-readable examples: "Mueller: Mon P3", "Room 101: Fri P5-P6" */
  @IsArray()
  @IsString({ each: true })
  examples!: string[];
}

export class ScoreHistoryEntryDto {
  /** Milliseconds since solve start */
  @IsInt()
  timestamp!: number;

  /** Hard score (0 = no hard violations) */
  @IsInt()
  hard!: number;

  /** Soft score (higher is better, always <= 0) */
  @IsInt()
  soft!: number;
}

export class SolveProgressDto {
  @IsString()
  runId!: string;

  @IsInt()
  hardScore!: number;

  @IsInt()
  softScore!: number;

  @IsInt()
  elapsedSeconds!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ViolationGroupDto)
  remainingViolations!: ViolationGroupDto[];

  @IsIn(['improving', 'plateauing', 'stagnant'])
  improvementRate!: 'improving' | 'plateauing' | 'stagnant';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreHistoryEntryDto)
  scoreHistory!: ScoreHistoryEntryDto[];
}
