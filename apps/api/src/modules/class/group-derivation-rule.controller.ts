import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GroupDerivationRuleService } from './group-derivation-rule.service';
import { CreateGroupDerivationRuleDto } from './dto/create-group-derivation-rule.dto';
import { UpdateGroupDerivationRuleDto } from './dto/update-group-derivation-rule.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';

@ApiTags('group-derivation-rules')
@ApiBearerAuth()
@Controller('classes/:classId/derivation-rules')
export class GroupDerivationRuleController {
  constructor(private service: GroupDerivationRuleService) {}

  @Get()
  @CheckPermissions({ action: 'read', subject: 'class' })
  @ApiOperation({ summary: 'List derivation rules for a class' })
  async findByClass(@Param('classId') classId: string) {
    return this.service.findByClass(classId);
  }

  @Post()
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({ summary: 'Create a new derivation rule for a class' })
  async create(
    @Param('classId') classId: string,
    @Body() dto: CreateGroupDerivationRuleDto,
  ) {
    return this.service.create(classId, dto);
  }

  @Put(':ruleId')
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({ summary: 'Update a derivation rule' })
  async update(
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateGroupDerivationRuleDto,
  ) {
    return this.service.update(ruleId, dto);
  }

  @Delete(':ruleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({ summary: 'Delete a derivation rule' })
  async remove(@Param('ruleId') ruleId: string) {
    await this.service.remove(ruleId);
  }
}
