import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsDateString, IsOptional, IsArray, ValidateNested } from 'class-validator';

export class CreateHolidayDto {
  @ApiProperty({ example: 'Herbstferien' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '2026-10-26' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-11-02' })
  @IsDateString()
  endDate!: string;
}

export class CreateAutonomousDayDto {
  @ApiProperty({ example: '2026-11-15' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ example: 'Schulautonomer Tag' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateSchoolYearDto {
  @ApiProperty({ example: '2026/2027' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '2026-09-07' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2027-02-07' })
  @IsDateString()
  semesterBreak!: string;

  @ApiProperty({ example: '2027-07-02' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ type: [CreateHolidayDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHolidayDto)
  holidays?: CreateHolidayDto[];

  @ApiPropertyOptional({ type: [CreateAutonomousDayDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAutonomousDayDto)
  autonomousDays?: CreateAutonomousDayDto[];
}
