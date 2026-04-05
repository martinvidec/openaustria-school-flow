import {
  IsEnum,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Austrian Lehrverpflichtungsgesetz-aligned absence reason taxonomy.
 * Must match Prisma AbsenceReason enum verbatim (@schoolflow/shared mirrors this).
 */
export const ABSENCE_REASON_VALUES = [
  'KRANK',
  'FORTBILDUNG',
  'DIENSTREISE',
  'SCHULVERANSTALTUNG',
  'ARZTTERMIN',
  'SONSTIGES',
] as const;

export type AbsenceReasonLiteral = (typeof ABSENCE_REASON_VALUES)[number];

export const ABSENCE_STATUS_VALUES = ['ACTIVE', 'CANCELLED', 'COMPLETED'] as const;
export type AbsenceStatusLiteral = (typeof ABSENCE_STATUS_VALUES)[number];

export class CreateTeacherAbsenceDto {
  @ApiProperty({ description: 'Teacher ID (Teacher.id, not Person.id)' })
  @IsUUID()
  teacherId!: string;

  @ApiProperty({ description: 'First absent date (inclusive, ISO-8601)' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ description: 'Last absent date (inclusive, ISO-8601)' })
  @IsDateString()
  dateTo!: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 12, description: 'Optional first period (1..12, inclusive)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodFrom?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 12, description: 'Optional last period (inclusive)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodTo?: number;

  @ApiProperty({ enum: ABSENCE_REASON_VALUES })
  @IsEnum(ABSENCE_REASON_VALUES)
  reason!: AbsenceReasonLiteral;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class ListAbsencesQueryDto {
  @ApiPropertyOptional({ enum: ABSENCE_STATUS_VALUES })
  @IsOptional()
  @IsEnum(ABSENCE_STATUS_VALUES)
  status?: AbsenceStatusLiteral;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
