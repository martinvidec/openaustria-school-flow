import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

/**
 * SUBST-06 -- Query DTO for GET /substitution-stats (fairness window).
 *
 * window=semester is the default per D-18. custom requires both customStart
 * and customEnd; others are computed from the current date.
 */
export const STATS_WINDOW_VALUES = [
  'week',
  'month',
  'semester',
  'schoolYear',
  'custom',
] as const;
export type StatsWindowLiteral = (typeof STATS_WINDOW_VALUES)[number];

export class StatsWindowQueryDto {
  @IsEnum(STATS_WINDOW_VALUES)
  @ApiProperty({
    description: 'Aggregation window for fairness statistics',
    enum: STATS_WINDOW_VALUES,
    example: 'semester',
  })
  window!: StatsWindowLiteral;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'Start date (ISO) for custom window',
  })
  customStart?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'End date (ISO) for custom window',
  })
  customEnd?: string;
}
