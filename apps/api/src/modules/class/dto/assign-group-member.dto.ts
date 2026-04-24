import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Manual group-member assignment (CLASS-04, D-11).
 * `isAutoAssigned` defaults to false because the UI always creates manual overrides.
 *
 * Plan 12-03 Rule-1 fix: `@IsUUID()` rejected seed student IDs (literal strings).
 */
export class AssignGroupMemberDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  studentId!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAutoAssigned?: boolean;
}
