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
 * Phase 13-01 USER-03 — POST /admin/permission-overrides body.
 *
 * Mirrors `createPermissionOverrideSchema` (packages/shared) at the
 * NestJS layer. `reason` is required (D-07 audit trail); `conditions`
 * is a free-form Record (CASL evaluates JS predicates, no injection
 * vector per T-13-03).
 */
export class CreatePermissionOverrideDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  action!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty()
  @IsBoolean()
  granted!: boolean;

  @ApiPropertyOptional({ type: Object, nullable: true })
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsObject()
  conditions: Record<string, unknown> | null = null;

  @ApiProperty({ description: 'Required justification for the audit trail' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
