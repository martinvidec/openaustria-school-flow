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
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionOverrideService } from './permission-override.service';
import { CreatePermissionOverrideDto } from './dto/create-permission-override.dto';
import { UpdatePermissionOverrideDto } from './dto/update-permission-override.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';

/**
 * Phase 13-01 USER-03 — admin permission-override CRUD.
 *
 * All endpoints under `/admin/permission-overrides` require
 * `manage permission-override` ability. The PermissionsGuard
 * (Phase 1 D-04) rejects 403 on missing capability.
 */
@ApiTags('admin / permission-overrides')
@ApiBearerAuth()
@Controller('admin/permission-overrides')
export class PermissionOverrideController {
  constructor(private readonly service: PermissionOverrideService) {}

  @Get()
  @CheckPermissions({ action: 'manage', subject: 'permission-override' })
  @ApiOperation({
    summary: 'List all permission-overrides for a user (?userId=...)',
  })
  async findAllForUser(@Query('userId') userId: string) {
    return this.service.findAllForUser(userId);
  }

  @Post()
  @CheckPermissions({ action: 'manage', subject: 'permission-override' })
  @ApiOperation({ summary: 'Create a new permission-override' })
  @ApiResponse({
    status: 409,
    description:
      'A permission-override already exists for this (userId, action, subject) triple',
  })
  async create(
    @Body() dto: CreatePermissionOverrideDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.id);
  }

  @Put(':id')
  @CheckPermissions({ action: 'manage', subject: 'permission-override' })
  @ApiOperation({ summary: 'Update a permission-override' })
  @ApiResponse({ status: 404, description: 'Override not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionOverrideDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'manage', subject: 'permission-override' })
  @ApiOperation({ summary: 'Delete a permission-override' })
  @ApiResponse({ status: 404, description: 'Override not found' })
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
  }
}
