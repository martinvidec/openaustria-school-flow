import { IsString, IsOptional, IsDateString, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateExamDto {
  @ApiPropertyOptional({ example: 'Mathematik Schularbeit Nr. 3 (Nachtermin)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: '2026-04-27T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiPropertyOptional({ example: 'Nachtermin fuer fehlende Schueler' })
  @IsOptional()
  @IsString()
  description?: string;
}
