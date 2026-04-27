import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @CheckPermissions({ action: 'read', subject: 'audit' })
  @ApiOperation({
    summary: 'Query audit trail entries (role-scoped visibility)',
  })
  @ApiResponse({ status: 200, description: 'Paginated audit entries' })
  async findAll(
    @Query() query: QueryAuditDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditService.findAll({
      userId: query.userId,
      resource: query.resource,
      category: query.category,
      action: query.action,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
      requestingUser: user,
    });
  }
}
