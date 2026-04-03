import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { ClassBookController } from './classbook.controller';
import { LessonContentService } from './lesson-content.service';
import { GradeController } from './grade.controller';
import { GradeService } from './grade.service';

@Module({
  controllers: [AttendanceController, ClassBookController, GradeController],
  providers: [AttendanceService, LessonContentService, GradeService],
  exports: [AttendanceService, LessonContentService, GradeService],
})
export class ClassBookModule {}
