import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';
import { PROCESSING_PURPOSES, ProcessingPurposeValue } from './create-consent.dto';

/**
 * Status filter values for the admin consent list view (DSGVO-ADM-01).
 * - granted   → granted=true AND withdrawnAt IS NULL
 * - withdrawn → withdrawnAt IS NOT NULL
 * - expired   → granted=false AND withdrawnAt IS NULL (re-grant in-flight or never granted)
 */
export const CONSENT_STATUS_FILTERS = ['granted', 'withdrawn', 'expired'] as const;
export type ConsentStatusFilter = (typeof CONSENT_STATUS_FILTERS)[number];

export class QueryConsentAdminDto extends PaginationQueryDto {
  @ApiProperty({
    description:
      'School scope (REQUIRED — Pitfall 4 / RESEARCH §8 tenant isolation; missing schoolId would silently return all schools)',
    format: 'uuid',
  })
  @IsUUID()
  schoolId!: string;

  @ApiPropertyOptional({
    description: 'Filter by processing purpose (DSGVO Zweckbindung)',
    enum: PROCESSING_PURPOSES,
  })
  @IsOptional()
  @IsEnum(PROCESSING_PURPOSES, {
    message: `Unknown processing purpose. Valid: ${PROCESSING_PURPOSES.join(', ')}`,
  })
  purpose?: ProcessingPurposeValue;

  @ApiPropertyOptional({
    description:
      'Filter by consent status. granted = currently active; withdrawn = withdrawnAt set; expired = granted=false AND no withdrawal timestamp',
    enum: CONSENT_STATUS_FILTERS,
  })
  @IsOptional()
  @IsEnum(CONSENT_STATUS_FILTERS)
  status?: ConsentStatusFilter;

  @ApiPropertyOptional({
    description: 'Substring search across person.firstName / lastName / email (case-insensitive)',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  personSearch?: string;
}
