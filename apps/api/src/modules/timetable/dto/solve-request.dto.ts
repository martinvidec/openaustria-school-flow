import { IsInt, IsOptional, Min, Max, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for starting a new solve run.
 * Admin submits this to POST /api/v1/schools/:schoolId/timetable/solve
 */
export class StartSolveDto {
  @IsInt()
  @IsOptional()
  @Min(30)
  @Max(600)
  @ApiPropertyOptional({
    description: 'Maximum solving time in seconds (default 300 = 5 min, per D-09)',
    minimum: 30,
    maximum: 600,
    default: 300,
    example: 300,
  })
  maxSolveSeconds?: number;

  @IsObject()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Soft constraint weight overrides. Keys must match constraint names.',
    example: { 'Prefer double periods': 10, 'Minimize room changes': 5 },
  })
  constraintWeights?: Record<string, number>;
}
