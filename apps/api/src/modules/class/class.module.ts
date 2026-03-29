import { Module } from '@nestjs/common';
import { ClassController } from './class.controller';
import { ClassService } from './class.service';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { GroupMembershipRuleService } from './group-membership-rule.service';

@Module({
  controllers: [ClassController, GroupController],
  providers: [ClassService, GroupService, GroupMembershipRuleService],
  exports: [ClassService, GroupService, GroupMembershipRuleService],
})
export class ClassModule {}
