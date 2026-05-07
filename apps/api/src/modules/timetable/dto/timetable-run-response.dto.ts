import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for TimetableRun queries.
 */
export class TimetableRunResponseDto {
  @ApiProperty({ description: 'Run UUID' })
  id!: string;

  @ApiProperty({ description: 'School UUID' })
  schoolId!: string;

  @ApiProperty({ description: 'Solve status: QUEUED, SOLVING, COMPLETED, FAILED, STOPPED' })
  status!: string;

  @ApiPropertyOptional({ description: 'Hard constraint score (0 = feasible)', nullable: true })
  hardScore!: number | null;

  @ApiPropertyOptional({ description: 'Soft constraint score', nullable: true })
  softScore!: number | null;

  @ApiPropertyOptional({ description: 'Elapsed solving time in seconds', nullable: true })
  elapsedSeconds!: number | null;

  @ApiPropertyOptional({ description: 'Constraint violations JSON', nullable: true })
  violations!: unknown | null;

  @ApiProperty({ description: 'Whether this run is the active/selected timetable' })
  isActive!: boolean;

  @ApiProperty({ description: 'Maximum allowed solving time in seconds' })
  maxSolveSeconds!: number;

  @ApiProperty({ description: 'Whether A/B week mode was enabled for this run' })
  abWeekEnabled!: boolean;

  @ApiPropertyOptional({
    description:
      'Human-readable error message — set when status=FAILED (watchdog timeout, sidecar 5xx). Issue #53.',
    nullable: true,
  })
  errorReason!: string | null;

  @ApiProperty({ description: 'Run creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}
