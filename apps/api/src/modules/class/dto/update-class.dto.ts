import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

/**
 * Update payload for /classes/:id — Phase 12-02 CLASS-02.
 *
 * klassenvorstandId supports explicit `null` (clear the Klassenvorstand)
 * via ValidateIf guard so undefined fields stay unchanged and null hits
 * the Prisma update as a SET NULL.
 */
export class UpdateClassDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 13 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(13)
  yearLevel?: number;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  klassenvorstandId?: string | null;
}
