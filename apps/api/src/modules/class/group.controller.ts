import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GroupService } from './group.service';
import {
  GroupAutoAssignRule,
  GroupMembershipRuleService,
} from './group-membership-rule.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { AssignGroupMemberDto } from './dto/assign-group-member.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';

@ApiTags('groups')
@ApiBearerAuth()
@Controller()
export class GroupController {
  constructor(
    private groupService: GroupService,
    private groupMembershipRuleService: GroupMembershipRuleService,
  ) {}

  @Post('groups')
  @CheckPermissions({ action: 'create', subject: 'class' })
  @ApiOperation({ summary: 'Create a new group within a class' })
  @ApiResponse({ status: 201, description: 'Group created' })
  async create(@Body() dto: CreateGroupDto) {
    return this.groupService.create(dto);
  }

  @Get('groups/by-class/:classId')
  @CheckPermissions({ action: 'read', subject: 'class' })
  @ApiOperation({ summary: 'List groups for a class with members' })
  async findByClass(@Param('classId') classId: string) {
    return this.groupService.findByClass(classId);
  }

  @Get('groups/:id')
  @CheckPermissions({ action: 'read', subject: 'class' })
  @ApiOperation({ summary: 'Get a group with members' })
  async findOne(@Param('id') id: string) {
    return this.groupService.findOne(id);
  }

  @Post('groups/:id/members')
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({
    summary:
      'Add a student to a group. Defaults to manual (isAutoAssigned=false) per CLASS-04 / D-11.',
  })
  @ApiResponse({ status: 201, description: 'Student added to group' })
  @ApiResponse({ status: 409, description: 'Student is already a member' })
  async addMember(
    @Param('id') groupId: string,
    @Body() dto: AssignGroupMemberDto,
  ) {
    return this.groupService.addMember(groupId, dto.studentId, dto.isAutoAssigned ?? false);
  }

  @Delete('groups/:id/members/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({ summary: 'Remove a student from a group' })
  async removeMember(
    @Param('id') groupId: string,
    @Param('studentId') studentId: string,
  ) {
    await this.groupService.removeMember(groupId, studentId);
  }

  @Delete('groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'class' })
  @ApiOperation({ summary: 'Delete a group (cascades memberships)' })
  async remove(@Param('id') id: string) {
    await this.groupService.remove(id);
  }

  @Post('groups/apply-rules/:classId')
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({
    summary:
      'Apply auto-derivation rules. When body is empty, defaults to DB-stored GroupDerivationRule rows (D-12).',
  })
  async applyRules(
    @Param('classId') classId: string,
    @Body() rules: GroupAutoAssignRule[] | undefined,
  ) {
    const hasInlineRules = Array.isArray(rules) && rules.length > 0;
    return this.groupMembershipRuleService.applyRules(
      classId,
      hasInlineRules ? rules : undefined,
    );
  }

  @Get('classes/:classId/apply-rules/preview')
  @CheckPermissions({ action: 'read', subject: 'class' })
  @ApiOperation({
    summary:
      'Dry-run preview of applyRules — surfaces new groups / memberships / manual-override conflicts (D-10).',
  })
  async previewApplyRules(@Param('classId') classId: string) {
    return this.groupMembershipRuleService.applyRulesDryRun(classId);
  }

  @Delete('groups/auto-assignments/:classId')
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({ summary: 'Clear all auto-assigned memberships for a class' })
  async clearAutoAssignments(@Param('classId') classId: string) {
    return this.groupMembershipRuleService.clearAutoAssignments(classId);
  }
}
