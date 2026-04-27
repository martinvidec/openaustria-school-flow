import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';

enum AuditCategoryFilter {
  MUTATION = 'MUTATION',
  SENSITIVE_READ = 'SENSITIVE_READ',
}

enum AuditActionFilter {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  READ = 'read',
}

/**
 * Query DTO for `GET /audit/export.csv` (Plan 15-02, AUDIT-VIEW-03).
 *
 * Mirrors `QueryAuditDto` MINUS pagination (`page`/`limit`) — server-side
 * export is hard-capped at 10k rows by `AuditService.exportCsv` per D-25.
 */
export class ExportAuditQueryDto {
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by resource type',
    example: 'school',
  })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({ enum: AuditCategoryFilter })
  @IsOptional()
  @IsEnum(AuditCategoryFilter)
  category?: string;

  @ApiPropertyOptional({
    enum: AuditActionFilter,
    description: 'Filter by audit action',
    example: 'update',
  })
  @IsOptional()
  @IsEnum(AuditActionFilter)
  action?: string;

  @ApiPropertyOptional({
    description: 'Start date filter (ISO 8601)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date filter (ISO 8601)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
