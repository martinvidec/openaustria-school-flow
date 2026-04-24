import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

/**
 * Phase 13-01 USER-03 — PUT /admin/permission-overrides/:id body.
 *
 * `reason` is required on update (audit trail D-07); other fields are
 * optional partial-updates.
 */
export class UpdatePermissionOverrideDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  granted?: boolean;

  @ApiPropertyOptional({ type: Object, nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown> | null;

  @ApiProperty({ description: 'Required justification for the audit trail' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
