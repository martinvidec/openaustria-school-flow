import { Module } from '@nestjs/common';
import { TimetableController, SolverCallbackController } from './timetable.controller';
import { TimetableService } from './timetable.service';
import { TimetableEditService } from './timetable-edit.service';
import { TimetableExportService } from './timetable-export.service';
import { TimetableGateway } from './timetable.gateway';
import { TimetableEventsGateway } from './timetable-events.gateway';
import { SolverInputService } from './solver-input.service';
import { SolverClientService } from './solver-client.service';
import { SolveProcessor } from './processors/solve.processor';
import { ConstraintTemplateController } from './constraint-template.controller';
import { ConstraintTemplateService } from './constraint-template.service';

@Module({
  controllers: [TimetableController, SolverCallbackController, ConstraintTemplateController],
  providers: [
    TimetableService,
    TimetableEditService,
    TimetableExportService,
    TimetableGateway,
    TimetableEventsGateway,
    SolverInputService,
    SolverClientService,
    SolveProcessor,
    ConstraintTemplateService,
  ],
  exports: [TimetableService, TimetableEditService, TimetableExportService, TimetableGateway, TimetableEventsGateway, ConstraintTemplateService],
})
export class TimetableModule {}
