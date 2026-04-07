import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHomeworkDto {
  @ApiProperty({ example: 'Kapitel 5 Zusammenfassung' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'Lesen Sie Kapitel 5 und schreiben Sie eine Zusammenfassung.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-04-14T00:00:00.000Z' })
  @IsDateString()
  dueDate!: string;

  @ApiProperty({ example: 'cs-uuid-123' })
  @IsString()
  @IsNotEmpty()
  classSubjectId!: string;

  @ApiPropertyOptional({ example: 'cbe-uuid-456' })
  @IsOptional()
  @IsString()
  classBookEntryId?: string;
}
