import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, Min, Max, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GradeCategoryEnum {
  SCHULARBEIT = 'SCHULARBEIT',
  MUENDLICH = 'MUENDLICH',
  MITARBEIT = 'MITARBEIT',
}

// Valid grade decimal values per D-05
const VALID_GRADES = [0.75, 1.0, 1.25, 1.75, 2.0, 2.25, 2.75, 3.0, 3.25, 3.75, 4.0, 4.25, 4.75, 5.0, 5.25];

export class CreateGradeEntryDto {
  @ApiProperty({ description: 'ClassSubject ID' })
  @IsString()
  classSubjectId!: string;

  @ApiProperty({ description: 'Student ID' })
  @IsString()
  studentId!: string;

  @ApiProperty({ enum: GradeCategoryEnum })
  @IsEnum(GradeCategoryEnum)
  category!: GradeCategoryEnum;

  @ApiProperty({ description: 'Grade decimal value (D-05): 1+=0.75, 2=2.0, etc.', type: Number })
  @IsNumber()
  @IsIn(VALID_GRADES)
  value!: number;

  @ApiPropertyOptional({ description: 'What was graded (description)' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Date the grade was given (ISO)' })
  @IsDateString()
  date!: string;
}

export class UpdateGradeEntryDto {
  @ApiPropertyOptional({ enum: GradeCategoryEnum })
  @IsOptional()
  @IsEnum(GradeCategoryEnum)
  category?: GradeCategoryEnum;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  @IsIn(VALID_GRADES)
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class UpdateGradeWeightDto {
  @ApiProperty({ description: 'Schularbeit weight percentage (D-06)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  schularbeitPct!: number;

  @ApiProperty({ description: 'Muendlich weight percentage', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  muendlichPct!: number;

  @ApiProperty({ description: 'Mitarbeit weight percentage', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  mitarbeitPct!: number;
}

export class GradeMatrixQueryDto {
  @ApiPropertyOptional({ description: 'Filter by grade category', enum: GradeCategoryEnum })
  @IsOptional()
  @IsEnum(GradeCategoryEnum)
  category?: GradeCategoryEnum;

  @ApiPropertyOptional({ description: 'Sort field: "name" or "average"', default: 'name' })
  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'average';
}
