import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExamResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  date!: string;

  @ApiProperty()
  classSubjectId!: string;

  @ApiProperty()
  classId!: string;

  @ApiPropertyOptional()
  duration!: number | null;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty()
  schoolId!: string;

  @ApiProperty()
  createdBy!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional()
  subjectName?: string;

  @ApiPropertyOptional()
  className?: string;
}
