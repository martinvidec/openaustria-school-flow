import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateDsfaEntryDto {
  @ApiProperty({ description: 'School ID' })
  @IsUUID()
  schoolId!: string;

  @ApiProperty({ description: 'DSFA entry title' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ description: 'Description of the processing activity' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Categories of data being processed', type: [String] })
  @IsArray()
  @IsString({ each: true })
  dataCategories!: string[];

  @ApiPropertyOptional({ description: 'Risk assessment text' })
  @IsOptional()
  @IsString()
  riskAssessment?: string;

  @ApiPropertyOptional({ description: 'Mitigation measures text' })
  @IsOptional()
  @IsString()
  mitigationMeasures?: string;
}
