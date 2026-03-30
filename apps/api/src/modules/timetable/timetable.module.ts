import { Module } from '@nestjs/common';
import { ConstraintTemplateController } from './constraint-template.controller';
import { ConstraintTemplateService } from './constraint-template.service';

@Module({
  controllers: [ConstraintTemplateController],
  providers: [ConstraintTemplateService],
  exports: [ConstraintTemplateService],
})
export class TimetableModule {}
