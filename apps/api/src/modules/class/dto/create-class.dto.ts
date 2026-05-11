import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';

export class CreateClassDto {
  @ApiProperty({ description: 'School ID' })
  // Plan 12-03 Rule-1 fix: seed school IDs are literal strings, not UUIDs.
  @IsString()
  @MinLength(1)
  schoolId!: string;

  @ApiProperty({ description: 'Class name, e.g. "3B"', example: '3B', minLength: 1, maxLength: 20 })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  name!: string;

  @ApiProperty({ description: 'Year level (1-13)', example: 3, minimum: 1, maximum: 13 })
  @IsInt()
  @Min(1)
  @Max(13)
  yearLevel!: number;

  @ApiProperty({ description: 'School year ID' })
  // Plan 12-03 Rule-1 fix: seed school-year IDs are literal strings, not UUIDs.
  @IsString()
  @MinLength(1)
  schoolYearId!: string;

  @ApiPropertyOptional({ description: 'Klassenvorstand teacher ID (optional)' })
  @IsOptional()
  @IsString()
  klassenvorstandId?: string;

  @ApiPropertyOptional({
    description:
      'Home room ID (Heimraum). Drives the solver homeRoomPreference soft constraint — see issue #67.',
  })
  @IsOptional()
  @IsString()
  homeRoomId?: string;
}
