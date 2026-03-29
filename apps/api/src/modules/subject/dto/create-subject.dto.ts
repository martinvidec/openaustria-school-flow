import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, IsUUID, MinLength, MaxLength } from 'class-validator';

enum SubjectTypeDto {
  PFLICHT = 'PFLICHT',
  WAHLPFLICHT = 'WAHLPFLICHT',
  FREIGEGENSTAND = 'FREIGEGENSTAND',
  UNVERBINDLICH = 'UNVERBINDLICH',
}

export class CreateSubjectDto {
  @ApiProperty({ description: 'School ID', example: 'uuid' })
  @IsUUID()
  schoolId!: string;

  @ApiProperty({ description: 'Full subject name', example: 'Deutsch', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Short name / abbreviation', example: 'D', minLength: 1, maxLength: 10 })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  shortName!: string;

  @ApiProperty({ enum: SubjectTypeDto, description: 'Subject type (Pflicht, Wahlpflicht, etc.)', example: 'PFLICHT' })
  @IsEnum(SubjectTypeDto)
  subjectType!: SubjectTypeDto;

  @ApiPropertyOptional({ description: 'Lehrverpflichtungsgruppe (I, II, III, IV, IVa, V, Va)', example: 'I' })
  @IsOptional()
  @IsString()
  lehrverpflichtungsgruppe?: string;

  @ApiPropertyOptional({ description: 'Werteinheiten factor for teacher workload calculation', example: 1.0 })
  @IsOptional()
  @IsNumber()
  werteinheitenFactor?: number;
}
