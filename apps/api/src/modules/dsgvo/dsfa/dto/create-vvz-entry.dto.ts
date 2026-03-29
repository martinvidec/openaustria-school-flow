import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateVvzEntryDto {
  @ApiProperty({ description: 'School ID' })
  @IsUUID()
  schoolId!: string;

  @ApiProperty({ description: 'Name of the processing activity' })
  @IsString()
  @MinLength(1)
  activityName!: string;

  @ApiProperty({ description: 'Purpose of processing' })
  @IsString()
  purpose!: string;

  @ApiProperty({ description: 'Legal basis for processing' })
  @IsString()
  legalBasis!: string;

  @ApiProperty({ description: 'Categories of data being processed', type: [String] })
  @IsArray()
  @IsString({ each: true })
  dataCategories!: string[];

  @ApiProperty({ description: 'Affected person groups (e.g., Schueler, Lehrer, Eltern)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  affectedPersons!: string[];

  @ApiPropertyOptional({ description: 'Retention period description (e.g., "60 Jahre")' })
  @IsOptional()
  @IsString()
  retentionPeriod?: string;

  @ApiPropertyOptional({ description: 'Technical measures for data protection' })
  @IsOptional()
  @IsString()
  technicalMeasures?: string;

  @ApiPropertyOptional({ description: 'Organizational measures for data protection' })
  @IsOptional()
  @IsString()
  organizationalMeasures?: string;
}
