import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

/**
 * Mirror of Prisma DsgvoJobStatus (apps/api/prisma/schema.prisma:307-312).
 * Frontend (plan 15-08) maps these to the UI badge variants:
 * QUEUED -> pending, PROCESSING -> running, COMPLETED -> completed, FAILED -> failed.
 */
export enum DsgvoJobStatusFilter {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * Mirror of Prisma DsgvoJobType (apps/api/prisma/schema.prisma:301-305).
 */
export enum DsgvoJobTypeFilter {
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_DELETION = 'DATA_DELETION',
  RETENTION_CLEANUP = 'RETENTION_CLEANUP',
}

/**
 * Query DTO for the school-wide DSGVO jobs admin list (D-23).
 *
 * Pitfall 4: schoolId is REQUIRED -- never `@IsOptional`. A missing schoolId
 * with `where: { schoolId: undefined }` would silently return all schools'
 * jobs to the calling admin (cross-tenant leak). Mirrors plan 15-03's
 * QueryConsentAdminDto pattern.
 */
export class QueryDsgvoJobsDto extends PaginationQueryDto {
  @ApiProperty({ description: 'Tenant scope (required, mandatory)' })
  @IsUUID()
  schoolId!: string;

  @ApiPropertyOptional({ enum: DsgvoJobStatusFilter, description: 'Filter by Prisma DsgvoJobStatus' })
  @IsOptional()
  @IsEnum(DsgvoJobStatusFilter)
  status?: DsgvoJobStatusFilter;

  @ApiPropertyOptional({ enum: DsgvoJobTypeFilter, description: 'Filter by Prisma DsgvoJobType' })
  @IsOptional()
  @IsEnum(DsgvoJobTypeFilter)
  jobType?: DsgvoJobTypeFilter;
}
