import { IsString, IsEnum, IsOptional, IsDateString, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExcuseReasonEnum {
  KRANK = 'KRANK',
  ARZTTERMIN = 'ARZTTERMIN',
  FAMILIAER = 'FAMILIAER',
  SONSTIG = 'SONSTIG',
}

export enum ExcuseStatusEnum {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export class CreateExcuseDto {
  @ApiProperty({ description: 'Student ID (child)' })
  @IsString()
  studentId!: string;

  @ApiProperty({ description: 'Start date (ISO)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date (ISO), must be >= startDate' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ enum: ExcuseReasonEnum, description: 'Reason category (D-11)' })
  @IsEnum(ExcuseReasonEnum)
  reason!: ExcuseReasonEnum;

  @ApiPropertyOptional({ description: 'Optional free-text note' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class ReviewExcuseDto {
  @ApiProperty({ enum: ['ACCEPTED', 'REJECTED'] })
  @IsIn(['ACCEPTED', 'REJECTED'])
  status!: 'ACCEPTED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Review note (required for rejection)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNote?: string;
}

export class ExcuseListQueryDto {
  @ApiPropertyOptional({ enum: ExcuseStatusEnum, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(ExcuseStatusEnum)
  status?: ExcuseStatusEnum;

  @ApiPropertyOptional({ description: 'Filter by student ID' })
  @IsOptional()
  @IsString()
  studentId?: string;
}
