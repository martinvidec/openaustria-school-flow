import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsArray, IsInt, IsBoolean, Min } from 'class-validator';

// Must match Prisma AvailabilityRuleType enum
enum AvailabilityRuleTypeDto {
  MAX_DAYS_PER_WEEK = 'MAX_DAYS_PER_WEEK',
  BLOCKED_PERIOD = 'BLOCKED_PERIOD',
  BLOCKED_DAY_PART = 'BLOCKED_DAY_PART',
  PREFERRED_FREE_DAY = 'PREFERRED_FREE_DAY',
}

// Must match Prisma DayOfWeek enum
enum DayOfWeekDto {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
}

enum DayPartDto {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
}

export class CreateAvailabilityRuleDto {
  @ApiProperty({
    enum: AvailabilityRuleTypeDto,
    example: 'BLOCKED_PERIOD',
    description: 'Type of availability constraint',
  })
  @IsEnum(AvailabilityRuleTypeDto)
  ruleType!: AvailabilityRuleTypeDto;

  @ApiPropertyOptional({ enum: DayOfWeekDto, example: 'MONDAY' })
  @IsOptional()
  @IsEnum(DayOfWeekDto)
  dayOfWeek?: DayOfWeekDto;

  @ApiPropertyOptional({
    type: [Number],
    example: [1, 2],
    description: 'Period numbers that are blocked',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  periodNumbers?: number[];

  @ApiPropertyOptional({
    example: 4,
    description: 'Maximum value (e.g. max days per week)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxValue?: number;

  @ApiPropertyOptional({ enum: DayPartDto, example: 'MORNING' })
  @IsOptional()
  @IsEnum(DayPartDto)
  dayPart?: DayPartDto;

  @ApiPropertyOptional({ default: true, description: 'Hard constraint (must be respected) vs soft (preferred)' })
  @IsOptional()
  @IsBoolean()
  isHard?: boolean;
}
