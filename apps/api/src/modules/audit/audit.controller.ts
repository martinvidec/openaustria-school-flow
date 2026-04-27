import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';
import { ExportAuditQueryDto } from './dto/export-audit.query.dto';
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

  /**
   * Export the filtered audit log as a Excel-compatible CSV file
   * (AUDIT-VIEW-03, D-05/D-16/D-25). Mirrors `findAll` filters and role
   * gate; the service hard-caps at 10,000 rows.
   *
   * Response shape:
   *   - 200 text/csv; charset=utf-8
   *   - Content-Disposition: attachment; filename="audit-log-YYYY-MM-DD.csv"
   *   - Body: UTF-8 BOM + RFC-4180 CSV (semicolon delimiter, \r\n)
   */
  @Get('export.csv')
  @CheckPermissions({ action: 'read', subject: 'audit' })
  @ApiOperation({
    summary:
      'Export audit log as CSV (filters identical to GET /audit, role-scoped, max 10k rows)',
  })
  @ApiResponse({
    status: 200,
    description:
      'text/csv with UTF-8 BOM and Content-Disposition attachment',
  })
  async exportCsv(
    @Query() query: ExportAuditQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() reply: any,
  ) {
    const csv = await this.auditService.exportCsv({
      userId: query.userId,
      resource: query.resource,
      category: query.category,
      action: query.action,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      requestingUser: user,
    });
    const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    return reply.send(csv);
  }
}
