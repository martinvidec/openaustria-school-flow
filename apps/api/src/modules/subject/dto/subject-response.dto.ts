import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubjectResponseDto {
  @ApiProperty({ description: 'Subject ID' })
  id!: string;

  @ApiProperty({ description: 'School ID' })
  schoolId!: string;

  @ApiProperty({ description: 'Full subject name', example: 'Deutsch' })
  name!: string;

  @ApiProperty({ description: 'Short name / abbreviation', example: 'D' })
  shortName!: string;

  @ApiProperty({ description: 'Subject type', example: 'PFLICHT' })
  subjectType!: string;

  @ApiPropertyOptional({ description: 'Lehrverpflichtungsgruppe', example: 'I' })
  lehrverpflichtungsgruppe?: string | null;

  @ApiPropertyOptional({ description: 'Werteinheiten factor', example: 1.0 })
  werteinheitenFactor?: number | null;

  @ApiProperty({ description: 'Number of classes this subject is assigned to' })
  classSubjectsCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
