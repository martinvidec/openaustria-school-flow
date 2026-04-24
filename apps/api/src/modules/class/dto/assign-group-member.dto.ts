import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

/**
 * Manual group-member assignment (CLASS-04, D-11).
 * `isAutoAssigned` defaults to false because the UI always creates manual overrides.
 */
export class AssignGroupMemberDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAutoAssigned?: boolean;
}
