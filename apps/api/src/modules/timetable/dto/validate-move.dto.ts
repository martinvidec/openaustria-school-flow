import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Request body for POST /timetable/validate-move and PATCH /timetable/lessons/:lessonId/move.
 * Describes the proposed move of a lesson to a new day/period/room.
 */
export class ValidateMoveDto {
  @IsUUID()
  @ApiProperty({
    description: 'ID of the lesson to move',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  lessonId!: string;

  @IsEnum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'])
  @ApiProperty({
    description: 'Target day of week',
    enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
    example: 'MONDAY',
  })
  targetDay!: string;

  @IsInt()
  @Min(1)
  @ApiProperty({
    description: 'Target period number (1-based)',
    minimum: 1,
    example: 3,
  })
  targetPeriod!: number;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    description: 'Target room ID (optional, keeps current room if not provided)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  targetRoomId?: string;
}

/**
 * A single hard constraint violation.
 */
export class ConstraintViolationDto {
  @ApiProperty({ description: 'Violation type identifier' })
  type!: string;

  @ApiProperty({ description: 'Human-readable description of the violation' })
  description!: string;
}

/**
 * A single soft constraint warning with weight.
 */
export class ConstraintWarningDto {
  @ApiProperty({ description: 'Warning type identifier' })
  type!: string;

  @ApiProperty({ description: 'Human-readable description of the warning' })
  description!: string;

  @ApiProperty({ description: 'Weight/severity of the warning' })
  weight!: number;
}

/**
 * Response from POST /timetable/validate-move.
 * Indicates whether the move is valid and lists any violations/warnings.
 */
export class MoveValidationResponseDto {
  @ApiProperty({ description: 'Whether the move passes all hard constraints' })
  valid!: boolean;

  @ApiProperty({ type: [ConstraintViolationDto], description: 'Hard constraint violations that block the move' })
  hardViolations!: ConstraintViolationDto[];

  @ApiProperty({ type: [ConstraintWarningDto], description: 'Soft constraint warnings (move still allowed)' })
  softWarnings!: ConstraintWarningDto[];
}
