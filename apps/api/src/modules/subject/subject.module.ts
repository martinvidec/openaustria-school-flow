import { Module } from '@nestjs/common';
import { SubjectController } from './subject.controller';
import { SubjectService } from './subject.service';
import { StundentafelTemplateService } from './stundentafel-template.service';

@Module({
  controllers: [SubjectController],
  providers: [SubjectService, StundentafelTemplateService],
  exports: [SubjectService, StundentafelTemplateService],
})
export class SubjectModule {}
