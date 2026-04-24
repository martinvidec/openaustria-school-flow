import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoleManagementService } from './role-management.service';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';

/**
 * Phase 13-01 USER-02 — role assignment surface.
 *
 * Three endpoints, all guarded by `manage user`:
 *   GET  /admin/roles                       — list all seeded roles
 *   GET  /admin/users/:userId/roles         — list a user's current roles
 *   PUT  /admin/users/:userId/roles         — replace roles (LOCK-01)
 *
 * The PUT endpoint applies the LOCK-01 mirror-write: writes prisma.userRole
 * inside a Serializable transaction THEN syncs Keycloak realm-role mappings.
 * Min-1-admin guard surfaces as RFC 9457 409 with type
 * `schoolflow://errors/last-admin-guard`.
 */
@ApiTags('admin / roles')
@ApiBearerAuth()
@Controller('admin')
export class RoleManagementController {
  constructor(private readonly service: RoleManagementService) {}

  @Get('roles')
  @CheckPermissions({ action: 'manage', subject: 'user' })
  @ApiOperation({ summary: 'List all seeded roles' })
  async listAllRoles() {
    return this.service.listAllRoles();
  }

  @Get('users/:userId/roles')
  @CheckPermissions({ action: 'manage', subject: 'user' })
  @ApiOperation({ summary: "List a single user's currently-assigned roles" })
  async listUserRoles(@Param('userId') userId: string) {
    return this.service.listUserRoles(userId);
  }

  @Put('users/:userId/roles')
  @CheckPermissions({ action: 'manage', subject: 'user' })
  @ApiOperation({
    summary:
      'Replace a user role set (LOCK-01 mirror-write — DB + Keycloak)',
  })
  @ApiResponse({
    status: 409,
    description:
      'Last-admin guard: this change would leave the school without an administrator',
  })
  async updateUserRoles(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    return this.service.updateUserRoles(userId, dto);
  }
}
