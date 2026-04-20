import { Module } from '@nestjs/common';
import { AutonomousDayController } from './autonomous-day.controller';
import { AutonomousDayService } from './autonomous-day.service';
import { HolidayController } from './holiday.controller';
import { HolidayService } from './holiday.service';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';
import { SchoolTimeGridController } from './school-time-grid.controller';
import { SchoolTimeGridService } from './school-time-grid.service';
import { SchoolYearController } from './school-year.controller';
import { SchoolYearService } from './school-year.service';

@Module({
  controllers: [
    SchoolController,
    SchoolTimeGridController,
    SchoolYearController,
    HolidayController,
    AutonomousDayController,
  ],
  providers: [
    SchoolService,
    SchoolTimeGridService,
    SchoolYearService,
    HolidayService,
    AutonomousDayService,
  ],
  exports: [
    SchoolService,
    SchoolTimeGridService,
    SchoolYearService,
    HolidayService,
    AutonomousDayService,
  ],
})
export class SchoolModule {}
