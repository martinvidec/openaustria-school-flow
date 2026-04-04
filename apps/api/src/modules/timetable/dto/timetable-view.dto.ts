import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Query parameters for GET /timetable/view
 * Filters the timetable view by perspective (teacher, class, or room).
 */
export class TimetableViewQueryDto {
  @IsEnum(['teacher', 'class', 'room'])
  @ApiProperty({
    description: 'View perspective',
    enum: ['teacher', 'class', 'room'],
    example: 'class',
  })
  perspective!: 'teacher' | 'class' | 'room';

  @IsString()
  @ApiProperty({
    description: 'ID of the entity to view (teacher, class, or room)',
    example: 'teacher-id',
  })
  perspectiveId!: string;

  @IsOptional()
  @IsEnum(['A', 'B', 'BOTH'])
  @ApiPropertyOptional({
    description: 'Filter by week type (A/B week or BOTH)',
    enum: ['A', 'B', 'BOTH'],
  })
  weekType?: string;
}

/**
 * Single lesson in the timetable view response.
 * Contains joined data from ClassSubject -> Subject, Teacher -> Person, and Room.
 */
export class TimetableViewLessonDto {
  @ApiProperty() id!: string;
  @ApiProperty() classSubjectId!: string;
  @ApiProperty() subjectId!: string;
  @ApiProperty() subjectAbbreviation!: string;
  @ApiProperty() subjectName!: string;
  @ApiProperty() teacherId!: string;
  @ApiProperty() teacherSurname!: string;
  @ApiProperty() roomId!: string;
  @ApiProperty() roomName!: string;
  @ApiProperty() dayOfWeek!: string;
  @ApiProperty() periodNumber!: number;
  @ApiProperty() weekType!: string;
  @ApiProperty() isManualEdit!: boolean;
  @ApiPropertyOptional() changeType?: 'substitution' | 'cancelled' | 'room-swap' | null;
  @ApiPropertyOptional() originalTeacherSurname?: string;
  @ApiPropertyOptional() originalRoomName?: string;
}

/**
 * Period info from TimeGrid -- maps to PeriodInfo shared type.
 */
export class PeriodDto {
  @ApiProperty() periodNumber!: number;
  @ApiProperty() startTime!: string;
  @ApiProperty() endTime!: string;
  @ApiProperty() isBreak!: boolean;
  @ApiProperty() label!: string | null;
  @ApiProperty() durationMin!: number;
}

/**
 * Full timetable view response with joined data.
 * Maps to TimetableViewResponse shared type.
 */
export class TimetableViewResponseDto {
  @ApiProperty() schoolId!: string;
  @ApiProperty() runId!: string;
  @ApiProperty() perspective!: string;
  @ApiProperty() perspectiveId!: string;
  @ApiProperty() perspectiveName!: string;
  @ApiProperty() abWeekEnabled!: boolean;
  @ApiProperty({ type: [PeriodDto] }) periods!: PeriodDto[];
  @ApiProperty({ type: [String] }) activeDays!: string[];
  @ApiProperty({ type: [TimetableViewLessonDto] }) lessons!: TimetableViewLessonDto[];
}
