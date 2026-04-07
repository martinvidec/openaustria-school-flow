import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateHomeworkDto {
  @ApiPropertyOptional({ example: 'Kapitel 5+6 Zusammenfassung' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Erweiterte Aufgabe inkl. Kapitel 6.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2026-04-21T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
