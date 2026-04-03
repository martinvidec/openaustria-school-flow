import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { LessonContentService } from './lesson-content.service';
import { UpdateLessonContentDto } from './dto/lesson-content.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';

@ApiTags('classbook')
@ApiBearerAuth()
@Controller('schools/:schoolId/classbook')
export class ClassBookController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly lessonContentService: LessonContentService,
  ) {}

  /**
   * GET /schools/:schoolId/classbook/:entryId
   * Get a ClassBookEntry by ID with full content fields.
   */
  @Get(':entryId')
  @ApiOperation({ summary: 'Get a ClassBookEntry by ID' })
  @ApiResponse({ status: 200, description: 'ClassBookEntry with content fields' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  async getEntry(@Param('entryId') entryId: string) {
    return this.lessonContentService.getContent(entryId);
  }

  /**
   * PATCH /schools/:schoolId/classbook/:entryId/content
   * Update lesson content (thema, lehrstoff, hausaufgabe).
   * Designed for auto-save from the frontend (debounced PATCH on input change).
   */
  @Patch(':entryId/content')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update lesson content (auto-save)' })
  @ApiResponse({ status: 200, description: 'Updated ClassBookEntry' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  async updateContent(
    @Param('entryId') entryId: string,
    @Body() dto: UpdateLessonContentDto,
  ) {
    return this.lessonContentService.updateContent(entryId, dto);
  }

  /**
   * GET /schools/:schoolId/classbook/:entryId/recent
   * Get recent entries for the same classSubject (last 3 by default).
   * Used by the "Letzte Eintraege" reference section in the lesson detail page.
   */
  @Get(':entryId/recent')
  @ApiOperation({ summary: 'Get recent entries for the same classSubject' })
  @ApiResponse({ status: 200, description: 'Recent ClassBookEntries with content fields' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  async getRecentEntries(@Param('entryId') entryId: string) {
    // First get the entry to find its classSubjectId
    const entry = await this.lessonContentService.getContent(entryId);
    return this.lessonContentService.getRecentEntries(entry.classSubjectId);
  }

  /**
   * GET /schools/:schoolId/classbook/by-lesson
   * Get or create entry by lesson params (create-on-navigate pattern).
   * Query params: classSubjectId, date, periodNumber, dayOfWeek, weekType.
   * This is the frontend's fallback when navigating to a lesson without a TimetableLesson ID.
   */
  @Get('by-lesson')
  @ApiOperation({ summary: 'Get or create ClassBookEntry by lesson params' })
  @ApiQuery({ name: 'classSubjectId', type: String })
  @ApiQuery({ name: 'date', type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'periodNumber', type: Number })
  @ApiQuery({ name: 'dayOfWeek', type: String })
  @ApiQuery({ name: 'weekType', type: String, required: false })
  @ApiResponse({ status: 200, description: 'ClassBookEntry' })
  async getByLessonParams(
    @Param('schoolId') schoolId: string,
    @Query('classSubjectId') classSubjectId: string,
    @Query('date') date: string,
    @Query('periodNumber') periodNumber: string,
    @Query('dayOfWeek') dayOfWeek: string,
    @Query('weekType') weekType: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.getOrCreateEntry(schoolId, user.id, {
      classSubjectId,
      date,
      periodNumber: parseInt(periodNumber, 10),
      dayOfWeek,
      weekType,
    });
  }

  /**
   * GET /schools/:schoolId/classbook/by-timetable-lesson/:timetableLessonId
   * CRITICAL: Resolves a TimetableLesson ID to a ClassBookEntry (D-03).
   * This is the primary frontend entry point when a teacher clicks a timetable cell.
   * Accepts optional ?date=YYYY-MM-DD query param (defaults to today).
   * Returns ClassBookEntryDto with joined subjectName, className, teacherName fields.
   */
  @Get('by-timetable-lesson/:timetableLessonId')
  @ApiOperation({ summary: 'Resolve TimetableLesson ID to a ClassBookEntry (primary timetable entry point)' })
  @ApiQuery({ name: 'date', type: String, required: false, description: 'ISO date (defaults to today)' })
  @ApiResponse({ status: 200, description: 'ClassBookEntry with joined display fields' })
  @ApiResponse({ status: 404, description: 'Stunde nicht gefunden' })
  async getByTimetableLesson(
    @Param('schoolId') schoolId: string,
    @Param('timetableLessonId') timetableLessonId: string,
    @Query('date') date: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.getOrCreateEntryByTimetableLesson(
      schoolId,
      user.id,
      timetableLessonId,
      date,
    );
  }
}
