import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KeycloakAdminService } from './keycloak-admin.service';
import { KeycloakUserQueryDto } from './dto/keycloak-user-query.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';

/**
 * Admin-only bridge to Keycloak's user directory.
 *
 * D-08: searching by email fragment beats a full dropdown because schools
 * with >500 KC accounts need an incremental lookup. The requiring permission
 * is `manage teacher` — linking a KC account is part of teacher administration.
 *
 * NOTE: throttling is deferred to a future pass (requires @nestjs/throttler
 * + APP_GUARD registration which is out-of-scope for this plan).
 */
@ApiTags('keycloak-admin')
@ApiBearerAuth()
@Controller('admin/keycloak')
export class KeycloakAdminController {
  constructor(private readonly service: KeycloakAdminService) {}

  @Get('users')
  @CheckPermissions({ action: 'manage', subject: 'teacher' })
  @ApiOperation({
    summary: 'Search Keycloak users by email fragment (min 3 chars, max 10 results)',
  })
  async findUsers(@Query() dto: KeycloakUserQueryDto) {
    return this.service.findUsersByEmail(dto.email);
  }
}
