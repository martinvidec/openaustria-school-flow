import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SchoolPaginationQueryDto } from '../../../common/dto/pagination.dto';

/**
 * Phase 12-01 STUDENT-02 / D-13.1: parent-list filters used by the
 * ParentSearchPopover (email-autocomplete, 300ms debounce). `email` matches
 * substrings case-insensitively; `name` matches firstName OR lastName.
 */
export class ParentListQueryDto extends SchoolPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Email exact or substring search' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Name substring (firstName or lastName)' })
  @IsOptional()
  @IsString()
  name?: string;
}
