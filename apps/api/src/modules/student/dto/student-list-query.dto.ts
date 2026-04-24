import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SchoolPaginationQueryDto } from '../../../common/dto/pagination.dto';

/**
 * Phase 12-01 STUDENT-04 / D-04: filter the student list by archive status.
 * Default `active` preserves the existing UI contract; `archived` + `all`
 * support the row-action "Archivieren / Reaktivieren" flow.
 */
export type StudentArchiveFilter = 'active' | 'archived' | 'all';

export class StudentListQueryDto extends SchoolPaginationQueryDto {
  @ApiPropertyOptional({
    enum: ['active', 'archived', 'all'],
    default: 'active',
    description: 'Archive filter: active (default) | archived | all',
  })
  @IsOptional()
  @IsEnum(['active', 'archived', 'all'])
  archived: StudentArchiveFilter = 'active';

  @ApiPropertyOptional({ description: 'Filter by Stammklasse ID' })
  @IsOptional()
  // Plan 12-03 Rule-1: seed class IDs are literal strings, not UUIDs.
  @IsString()
  classId?: string;

  @ApiPropertyOptional({ description: 'Text search on firstName/lastName/email' })
  @IsOptional()
  @IsString()
  declare search?: string;

  @ApiPropertyOptional({ description: 'Filter by Schuljahr (via class.schoolYearId)' })
  @IsOptional()
  // Plan 12-03 Rule-1: seed school-year IDs are literal strings, not UUIDs.
  @IsString()
  schoolYearId?: string;
}
