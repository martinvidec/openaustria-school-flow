import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLessonContentDto {
  @ApiPropertyOptional({ description: 'Topic/title of the lesson (D-09)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thema?: string;

  @ApiPropertyOptional({ description: 'Content covered in the lesson (D-09)' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  lehrstoff?: string;

  @ApiPropertyOptional({ description: 'Homework assigned (D-09)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  hausaufgabe?: string;
}
