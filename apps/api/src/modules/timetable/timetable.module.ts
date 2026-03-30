import { Module } from '@nestjs/common';
import { TimetableController, SolverCallbackController } from './timetable.controller';
import { TimetableService } from './timetable.service';
import { SolverInputService } from './solver-input.service';
import { SolverClientService } from './solver-client.service';
import { SolveProcessor } from './processors/solve.processor';
import { ConstraintTemplateController } from './constraint-template.controller';
import { ConstraintTemplateService } from './constraint-template.service';

@Module({
  controllers: [TimetableController, SolverCallbackController, ConstraintTemplateController],
  providers: [
    TimetableService,
    SolverInputService,
    SolverClientService,
    SolveProcessor,
    ConstraintTemplateService,
  ],
  exports: [TimetableService, ConstraintTemplateService],
})
export class TimetableModule {}
