import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsEnum,
} from 'class-validator';

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

export class QueryAuditDto {
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

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
