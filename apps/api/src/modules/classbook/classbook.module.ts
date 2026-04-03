import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { ClassBookController } from './classbook.controller';
import { LessonContentService } from './lesson-content.service';
import { GradeController } from './grade.controller';
import { GradeService } from './grade.service';
import { StudentNoteController } from './student-note.controller';
import { StudentNoteService } from './student-note.service';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { ExcuseController } from './excuse.controller';
import { ExcuseService } from './excuse.service';

@Module({
  controllers: [AttendanceController, ClassBookController, GradeController, StudentNoteController, StatisticsController, ExcuseController],
  providers: [AttendanceService, LessonContentService, GradeService, StudentNoteService, StatisticsService, ExcuseService],
  exports: [AttendanceService, LessonContentService, GradeService, StudentNoteService, StatisticsService, ExcuseService],
})
export class ClassBookModule {}
