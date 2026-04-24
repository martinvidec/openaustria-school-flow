import { Module } from '@nestjs/common';
import { ClassController } from './class.controller';
import { ClassService } from './class.service';
import { ClassSubjectService } from './class-subject.service';
import { ClassSubjectController } from './class-subject.controller';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { GroupMembershipRuleService } from './group-membership-rule.service';
import { GroupDerivationRuleService } from './group-derivation-rule.service';
import { GroupDerivationRuleController } from './group-derivation-rule.controller';
import { SubjectModule } from '../subject/subject.module';

@Module({
  imports: [SubjectModule], // brings StundentafelTemplateService
  controllers: [
    ClassController,
    GroupController,
    ClassSubjectController,
    GroupDerivationRuleController,
  ],
  providers: [
    ClassService,
    GroupService,
    GroupMembershipRuleService,
    ClassSubjectService,
    GroupDerivationRuleService,
  ],
  exports: [
    ClassService,
    GroupService,
    GroupMembershipRuleService,
    ClassSubjectService,
    GroupDerivationRuleService,
  ],
})
export class ClassModule {}
