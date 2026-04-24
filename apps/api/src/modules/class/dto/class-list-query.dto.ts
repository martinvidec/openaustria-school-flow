import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { SchoolPaginationQueryDto } from '../../../common/dto/pagination.dto';

/**
 * Filter query for /classes — Phase 12-02 CLASS-01.
 *
 * Extends SchoolPaginationQueryDto so `schoolId` + pagination stay in one place.
 * `yearLevels` accepts both ?yearLevels=1,2,3 (comma string) and
 * ?yearLevels=1&yearLevels=2 (repeated query) by transforming both
 * shapes into a number[] before validation.
 */
export class ClassListQueryDto extends SchoolPaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  // Plan 12-03 Rule-1: seed school-year IDs are literal strings.
  @IsString()
  schoolYearId?: string;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Comma-separated or repeated integers (1..13)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((v) => Number(v));
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
        .map((v) => Number(v));
    }
    return value;
  })
  @IsArray()
  @IsInt({ each: true })
  yearLevels?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare search?: string;
}
