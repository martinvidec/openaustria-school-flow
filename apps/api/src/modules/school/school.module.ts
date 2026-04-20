import { Module } from '@nestjs/common';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';
import { SchoolTimeGridController } from './school-time-grid.controller';
import { SchoolTimeGridService } from './school-time-grid.service';
import { SchoolYearController } from './school-year.controller';
import { SchoolYearService } from './school-year.service';

@Module({
  controllers: [SchoolController, SchoolTimeGridController, SchoolYearController],
  providers: [SchoolService, SchoolTimeGridService, SchoolYearService],
  exports: [SchoolService, SchoolTimeGridService, SchoolYearService],
})
export class SchoolModule {}
