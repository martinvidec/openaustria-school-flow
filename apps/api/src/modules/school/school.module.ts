import { Module } from '@nestjs/common';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';
import { SchoolYearController } from './school-year.controller';
import { SchoolYearService } from './school-year.service';

@Module({
  controllers: [SchoolController, SchoolYearController],
  providers: [SchoolService, SchoolYearService],
  exports: [SchoolService, SchoolYearService],
})
export class SchoolModule {}
