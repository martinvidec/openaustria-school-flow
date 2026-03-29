import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GroupService } from './group.service';
import { GroupMembershipRuleService, GroupAutoAssignRule } from './group-membership-rule.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { AssignStudentDto } from './dto/assign-student.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';

@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupController {
  constructor(
    private groupService: GroupService,
    private groupMembershipRuleService: GroupMembershipRuleService,
  ) {}

  @Post()
  @CheckPermissions({ action: 'create', subject: 'class' })
  @ApiOperation({ summary: 'Create a new group within a class' })
  @ApiResponse({ status: 201, description: 'Group created' })
  async create(@Body() dto: CreateGroupDto) {
    return this.groupService.create(dto);
  }

  @Get('by-class/:classId')
  @CheckPermissions({ action: 'read', subject: 'class' })
  @ApiOperation({ summary: 'List groups for a class with members' })
  @ApiResponse({ status: 200, description: 'List of groups' })
  async findByClass(@Param('classId') classId: string) {
    return this.groupService.findByClass(classId);
  }

  @Get(':id')
  @CheckPermissions({ action: 'read', subject: 'class' })
  @ApiOperation({ summary: 'Get a group with members' })
  @ApiResponse({ status: 200, description: 'Group found' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async findOne(@Param('id') id: string) {
    return this.groupService.findOne(id);
  }

  @Post(':id/members')
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({ summary: 'Add a student to a group (manual assignment)' })
  @ApiResponse({ status: 201, description: 'Student added to group' })
  @ApiResponse({ status: 409, description: 'Student is already a member' })
  async addMember(@Param('id') groupId: string, @Body() dto: AssignStudentDto) {
    return this.groupService.addMember(groupId, dto.studentId);
  }

  @Delete(':id/members/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({ summary: 'Remove a student from a group' })
  @ApiResponse({ status: 204, description: 'Student removed from group' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async removeMember(@Param('id') groupId: string, @Param('studentId') studentId: string) {
    await this.groupService.removeMember(groupId, studentId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'class' })
  @ApiOperation({ summary: 'Delete a group (cascades memberships)' })
  @ApiResponse({ status: 204, description: 'Group deleted' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async remove(@Param('id') id: string) {
    await this.groupService.remove(id);
  }

  @Post('apply-rules/:classId')
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({ summary: 'Apply auto-derivation rules to create groups and assign students' })
  @ApiResponse({ status: 200, description: 'Rules applied successfully' })
  async applyRules(@Param('classId') classId: string, @Body() rules: GroupAutoAssignRule[]) {
    return this.groupMembershipRuleService.applyRules(classId, rules);
  }

  @Delete('auto-assignments/:classId')
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({ summary: 'Clear all auto-assigned memberships for a class' })
  @ApiResponse({ status: 200, description: 'Auto-assignments cleared' })
  async clearAutoAssignments(@Param('classId') classId: string) {
    return this.groupMembershipRuleService.clearAutoAssignments(classId);
  }
}
