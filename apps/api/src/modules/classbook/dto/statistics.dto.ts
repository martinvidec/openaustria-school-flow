import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AbsenceStatisticsQueryDto {
  @ApiProperty({ description: 'Class ID to get statistics for' })
  @IsString()
  classId!: string;

  @ApiPropertyOptional({ description: 'Start date for statistics range (ISO). Defaults to current semester start.' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for statistics range (ISO). Defaults to today.' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class StudentAbsenceQueryDto {
  @ApiProperty({ description: 'Student ID' })
  @IsString()
  studentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
