import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, MinLength, MaxLength, IsBoolean } from 'class-validator';
import { CreateTimeGridDto } from './create-time-grid.dto';
import { CreateSchoolYearDto } from './create-school-year.dto';

// Must match Prisma SchoolType enum
enum SchoolTypeDto {
  VS = 'VS',
  MS = 'MS',
  AHS_UNTER = 'AHS_UNTER',
  AHS_OBER = 'AHS_OBER',
  BHS = 'BHS',
}

// Must match Prisma DayOfWeek enum
enum DayOfWeekDto {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
}

export class CreateSchoolDto {
  @ApiProperty({ example: 'BG/BRG Wien Amerlingstrasse', minLength: 3, maxLength: 200 })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: SchoolTypeDto, example: 'AHS_UNTER' })
  @IsEnum(SchoolTypeDto)
  schoolType!: SchoolTypeDto;

  @ApiPropertyOptional({ example: 'Amerlingstrasse 6, 1060 Wien' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'School days (defaults to Mo-Fr)', enum: DayOfWeekDto, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeekDto, { each: true })
  schoolDays?: DayOfWeekDto[];

  @ApiPropertyOptional({ description: 'Time grid with periods. If omitted, template for schoolType is used.', type: CreateTimeGridDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTimeGridDto)
  timeGrid?: CreateTimeGridDto;

  @ApiPropertyOptional({ description: 'School year structure', type: CreateSchoolYearDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateSchoolYearDto)
  schoolYear?: CreateSchoolYearDto;

  @ApiPropertyOptional({ description: 'If true, use predefined template for the schoolType instead of custom timeGrid', default: true })
  @IsOptional()
  @IsBoolean()
  useTemplate?: boolean;
}
