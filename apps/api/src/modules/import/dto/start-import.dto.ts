import { IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Mirrors Prisma enums for DTO validation.
 * These string unions match the ImportFileType / ImportEntityType / ImportConflictMode enums
 * in schema.prisma. Using string enum values directly to avoid tight coupling.
 */
export enum ImportFileTypeDto {
  UNTIS_XML = 'UNTIS_XML',
  UNTIS_DIF = 'UNTIS_DIF',
  CSV = 'CSV',
}

export enum ImportEntityTypeDto {
  TEACHERS = 'TEACHERS',
  CLASSES = 'CLASSES',
  ROOMS = 'ROOMS',
  STUDENTS = 'STUDENTS',
  TIMETABLE = 'TIMETABLE',
  MIXED = 'MIXED',
}

export enum ImportConflictModeDto {
  SKIP = 'SKIP',
  UPDATE = 'UPDATE',
  FAIL = 'FAIL',
}

export class StartImportDto {
  @ApiProperty({ enum: ImportFileTypeDto })
  @IsEnum(ImportFileTypeDto)
  fileType!: ImportFileTypeDto;

  @ApiProperty({ enum: ImportEntityTypeDto })
  @IsEnum(ImportEntityTypeDto)
  entityType!: ImportEntityTypeDto;

  @ApiPropertyOptional({ enum: ImportConflictModeDto })
  @IsEnum(ImportConflictModeDto)
  @IsOptional()
  conflictMode?: ImportConflictModeDto;

  @ApiPropertyOptional({ description: 'CSV column mapping: sourceColumn -> targetField' })
  @IsObject()
  @IsOptional()
  columnMapping?: Record<string, string>;
}
