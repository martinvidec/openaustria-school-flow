import { Controller, Post, Get, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { CreatePermissionOverrideDto } from './dto/create-permission-override.dto';
import { CheckPermissions } from '../decorators/check-permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthenticatedUser } from '../types/authenticated-user';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Post('overrides')
  @CheckPermissions({ action: 'manage', subject: 'permission' })
  @ApiOperation({ summary: 'Create or update a permission override for a user' })
  @ApiResponse({ status: 201, description: 'Override created/updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createOverride(
    @Body() dto: CreatePermissionOverrideDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.createOverride(dto, user.id);
  }

  @Get('overrides')
  @CheckPermissions({ action: 'read', subject: 'permission' })
  @ApiOperation({ summary: 'Get permission overrides for a user' })
  @ApiResponse({ status: 200, description: 'List of overrides' })
  async getOverrides(@Query('userId') userId: string) {
    return this.permissionsService.getOverridesForUser(userId);
  }

  @Delete('overrides/:id')
  @CheckPermissions({ action: 'manage', subject: 'permission' })
  @ApiOperation({ summary: 'Delete a permission override' })
  @ApiResponse({ status: 200, description: 'Override deleted' })
  @ApiResponse({ status: 404, description: 'Override not found' })
  async deleteOverride(@Param('id') id: string) {
    return this.permissionsService.deleteOverride(id);
  }

  @Get('roles')
  @CheckPermissions({ action: 'read', subject: 'permission' })
  @ApiOperation({ summary: 'Get all roles with their default permissions' })
  @ApiResponse({ status: 200, description: 'List of roles with permissions' })
  async getRoles() {
    return this.permissionsService.getRolesWithPermissions();
  }
}
