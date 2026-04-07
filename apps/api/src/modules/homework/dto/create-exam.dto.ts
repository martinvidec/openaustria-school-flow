import { IsString, IsNotEmpty, IsOptional, IsDateString, IsInt, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExamDto {
  @ApiProperty({ example: 'Mathematik Schularbeit Nr. 3' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: '2026-04-20T08:00:00.000Z' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: 'cs-uuid-math-1a' })
  @IsString()
  @IsNotEmpty()
  classSubjectId!: string;

  @ApiProperty({ example: 'class-uuid-1a' })
  @IsString()
  @IsNotEmpty()
  classId!: string;

  @ApiPropertyOptional({ example: 50, description: 'Duration in minutes' })
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiPropertyOptional({ example: 'Kapitel 1-5, Schwerpunkt Algebra' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Create exam even when collision exists (D-03 soft warning override)',
  })
  @IsOptional()
  @IsBoolean()
  forceCreate?: boolean;
}
