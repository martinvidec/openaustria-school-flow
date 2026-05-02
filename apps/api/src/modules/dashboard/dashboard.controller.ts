import {
  Controller,
  ForbiddenException,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardStatusDto } from './dto/dashboard-status.dto';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';

/**
 * Phase 16 Plan 01 Task 3 — Admin Dashboard read endpoint.
 *
 * Single round-trip aggregator (CONTEXT D-10) returning the 10-category
 * Setup-Completeness status (D-06). Admin-only (T-16-1) + cross-tenant
 * isolated (T-16-2) via DashboardService.resolveAdminSchoolId — replicates
 * the canonical Person.findFirst pattern from calendar.service.ts:79-80
 * + user-context.service.ts:9-11. AuthenticatedUser carries no schoolId
 * field, so tenant resolution MUST go through Person.
 */
@ApiTags('admin-dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('status')
  @CheckPermissions({ action: 'manage', subject: 'all' })
  @ApiOperation({
    summary:
      'Setup-Completeness status for all 10 categories (admin-only, tenant-scoped)',
  })
  @ApiResponse({ status: 200, type: DashboardStatusDto })
  async getStatus(
    @Query() query: QueryDashboardDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DashboardStatusDto> {
    // T-16-2 tenant isolation. AuthenticatedUser does NOT carry schoolId
    // (only id/email/username/roles — see auth/types/authenticated-user.ts).
    // Resolve tenant via Person.findFirst({ where: { keycloakUserId: user.id } })
    // — canonical pattern shared with calendar.service.ts:79-80 and
    // user-context.service.ts:9-11.
    const adminSchoolId = await this.dashboard.resolveAdminSchoolId(user.id);
    if (!adminSchoolId) {
      throw new ForbiddenException('Admin without school context');
    }
    if (adminSchoolId !== query.schoolId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }
    return this.dashboard.getStatus(query.schoolId);
  }
}
