import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Phase 13-01 USER-01 — GET /admin/users query parameters.
 *
 * Mirrors `keycloakUserQuerySchema` (packages/shared) at the HTTP layer
 * via class-validator (NestJS conventions). The shared Zod schema is
 * exposed for the frontend to validate the same shape on the client side.
 *
 * `role` accepts CSV (`?role=admin,lehrer`) OR repeated query params
 * (`?role=admin&role=lehrer`); the @Transform converts CSV to array.
 */
export class UserDirectoryQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit: number = 25;

  @ApiPropertyOptional({ description: 'Substring search (KC native, hits email/firstName/lastName)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by role name(s); accepts CSV or repeated key',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  role?: string[];

  @ApiPropertyOptional({ enum: ['all', 'linked', 'unlinked'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'linked', 'unlinked'])
  linked: 'all' | 'linked' | 'unlinked' = 'all';

  @ApiPropertyOptional({ enum: ['all', 'active', 'disabled'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'active', 'disabled'])
  enabled: 'all' | 'active' | 'disabled' = 'all';

  get first(): number {
    return (this.page - 1) * this.limit;
  }
}
