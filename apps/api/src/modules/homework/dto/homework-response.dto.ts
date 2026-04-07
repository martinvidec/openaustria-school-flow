import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HomeworkResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty()
  dueDate!: string;

  @ApiProperty()
  classSubjectId!: string;

  @ApiPropertyOptional()
  classBookEntryId!: string | null;

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
