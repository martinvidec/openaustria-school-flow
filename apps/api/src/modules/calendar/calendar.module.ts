import { Module } from '@nestjs/common';
import { HomeworkModule } from '../homework/homework.module';
import { CalendarService } from './calendar.service';
import { SisService } from './sis.service';
import { SisApiKeyGuard } from './guards/sis-api-key.guard';
import { CalendarController } from './calendar.controller';
import { SisController } from './sis.controller';

/**
 * Phase 8 Plan 04 -- Calendar & SIS integration module.
 *
 * Provides:
 *  - CalendarService: iCal subscription token management + ICS generation
 *    with timetable lessons, homework due dates, and exam dates (IMPORT-03)
 *  - SisService: Read-only student/teacher/class data for external SIS
 *    consumers via API key auth (IMPORT-04)
 *  - SisApiKeyGuard: X-Api-Key header validation for SIS endpoints
 *
 * Imports HomeworkModule for data access in CalendarService (homework + exam queries).
 */
@Module({
  imports: [HomeworkModule],
  controllers: [CalendarController, SisController],
  providers: [CalendarService, SisService, SisApiKeyGuard],
  exports: [CalendarService, SisService],
})
export class CalendarModule {}
