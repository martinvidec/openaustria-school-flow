import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { ClassBookController } from './classbook.controller';
import { LessonContentService } from './lesson-content.service';

@Module({
  controllers: [AttendanceController, ClassBookController],
  providers: [AttendanceService, LessonContentService],
  exports: [AttendanceService, LessonContentService],
})
export class ClassBookModule {}
