import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DsfaEntryResponseDto {
  @ApiProperty({ description: 'DSFA entry ID' })
  id!: string;

  @ApiProperty({ description: 'School ID' })
  schoolId!: string;

  @ApiProperty({ description: 'DSFA entry title' })
  title!: string;

  @ApiProperty({ description: 'Description of the processing activity' })
  description!: string;

  @ApiProperty({ description: 'Categories of data being processed', type: [String] })
  dataCategories!: string[];

  @ApiPropertyOptional({ description: 'Risk assessment text' })
  riskAssessment!: string | null;

  @ApiPropertyOptional({ description: 'Mitigation measures text' })
  mitigationMeasures!: string | null;

  @ApiProperty({ description: 'Entry status' })
  status!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}

export class VvzEntryResponseDto {
  @ApiProperty({ description: 'VVZ entry ID' })
  id!: string;

  @ApiProperty({ description: 'School ID' })
  schoolId!: string;

  @ApiProperty({ description: 'Name of the processing activity' })
  activityName!: string;

  @ApiProperty({ description: 'Purpose of processing' })
  purpose!: string;

  @ApiProperty({ description: 'Legal basis for processing' })
  legalBasis!: string;

  @ApiProperty({ description: 'Categories of data being processed', type: [String] })
  dataCategories!: string[];

  @ApiProperty({ description: 'Affected person groups', type: [String] })
  affectedPersons!: string[];

  @ApiPropertyOptional({ description: 'Retention period description' })
  retentionPeriod!: string | null;

  @ApiPropertyOptional({ description: 'Technical measures' })
  technicalMeasures!: string | null;

  @ApiPropertyOptional({ description: 'Organizational measures' })
  organizationalMeasures!: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}
