import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
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

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

/**
 * Pagination with mandatory schoolId filter.
 * Fixes forbidNonWhitelisted rejection when @Query('schoolId') is used
 * alongside @Query() PaginationQueryDto in controllers.
 */
export class SchoolPaginationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by school ID' })
  @IsOptional()
  @IsString()
  schoolId?: string;
}

export class PaginatedResponseDto<T> {
  data!: T[];
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
