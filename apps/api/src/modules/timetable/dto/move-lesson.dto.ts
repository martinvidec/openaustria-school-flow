import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Request body for PATCH /timetable/lessons/:lessonId/move.
 * Same shape as ValidateMoveDto but used for the actual move operation.
 * The lessonId comes from the URL param, so this DTO only carries target slot info.
 */
export class MoveLessonDto {
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
