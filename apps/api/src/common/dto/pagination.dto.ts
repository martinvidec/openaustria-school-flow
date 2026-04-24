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

  // Phase 12 Plan 12-03 Rule-1 fix: raised from 100 to 500 so admin pickers
  // (ClassPicker in MoveStudentDialog, ClassStudentsTab classListItems, etc.)
  // can request `limit=200` without hitting a 422. Mirrors the repository-wide
  // "one page of everything" expectation for tenant-scoped admin surfaces.
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
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

  /**
   * Optional substring search. Phase 12-02 gap-fix for TeacherSearchPopover
   * (D-08 / RESEARCH A2). TeacherService.findAll matches firstName / lastName
   * / email case-insensitively via Person.OR filter.
   */
  @ApiPropertyOptional({ description: 'Substring search (case-insensitive)' })
  @IsOptional()
  @IsString()
  search?: string;
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
