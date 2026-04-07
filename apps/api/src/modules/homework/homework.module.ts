import { Module } from '@nestjs/common';
import { SubstitutionModule } from '../substitution/substitution.module';
import { HomeworkService } from './homework.service';
import { ExamService } from './exam.service';
import { HomeworkController } from './homework.controller';
import { ExamController } from './exam.controller';

/**
 * Phase 8 -- Homework & Exams module.
 *
 * Plan 08-02: Implements homework and exam CRUD with:
 *   - Notification side-effects (HOMEWORK_ASSIGNED, EXAM_SCHEDULED) via
 *     NotificationService imported from SubstitutionModule
 *   - Exam collision detection (D-03 soft warning)
 *
 * Exports HomeworkService and ExamService for CalendarService (Plan 08-04).
 */
@Module({
  imports: [SubstitutionModule],
  controllers: [HomeworkController, ExamController],
  providers: [HomeworkService, ExamService],
  exports: [HomeworkService, ExamService],
})
export class HomeworkModule {}
