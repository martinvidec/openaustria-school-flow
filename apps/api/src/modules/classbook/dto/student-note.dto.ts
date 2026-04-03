import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentNoteDto {
  @ApiProperty({ description: 'Student ID to attach note to' })
  @IsString()
  studentId!: string;

  @ApiProperty({ description: 'Note content' })
  @IsString()
  @MaxLength(5000)
  content!: string;

  @ApiPropertyOptional({ description: 'Private flag (D-10): visible only to author + Schulleitung', default: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class UpdateStudentNoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}
