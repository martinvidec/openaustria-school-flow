import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Query parameters for GET /timetable/view
 * Filters the timetable view by perspective (teacher, class, or room).
 *
 * SUBST-05: the optional `date` param activates overlay-aware rendering —
 * Substitution rows (CONFIRMED/OFFERED) for the ISO week containing `date`
 * are joined and applied to the returned lessons.
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

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description:
      'Optional date (YYYY-MM-DD) for overlay-aware view. Substitutions in the ISO week of this date are merged on top of the recurring plan (SUBST-05).',
  })
  date?: string;
}

/**
 * Single lesson in the timetable view response.
 * Contains joined data from ClassSubject -> Subject, Teacher -> Person, and Room.
 *
 * SUBST-05: changeType='stillarbeit' is a new legitimate value when an overlaid
 * Substitution has type=STILLARBEIT.
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
  @ApiPropertyOptional()
  changeType?:
    | 'substitution'
    | 'cancelled'
    | 'room-swap'
    | 'stillarbeit'
    | null;
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
