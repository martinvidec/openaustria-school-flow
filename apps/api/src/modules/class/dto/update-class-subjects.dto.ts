import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * Single ClassSubject row in replace-all Wochenstunden editor (SUBJECT-04).
 *
 * Plan 12-03 Rule-1 fix: both `id` and `subjectId` relaxed from @IsUUID() to
 * @IsString() @MinLength(1). Seed fixture subjects use literal Prisma keys
 * (e.g. `seed-subject-m`, `seed-subject-d`) that are not RFC 4122 UUIDs —
 * the live admin UI saves those without issue until the DTO guard rejected
 * them with 422. Mirrors the Phase 11-03 Teacher DTO fix.
 */
export class ClassSubjectRowDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  id?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  subjectId!: string;

  @ApiProperty({ minimum: 0, maximum: 30 })
  @IsInt()
  @Min(0)
  @Max(30)
  weeklyHours!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  preferDoublePeriod?: boolean;
}

export class UpdateClassSubjectsDto {
  @ApiProperty({ type: [ClassSubjectRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassSubjectRowDto)
  @ArrayMinSize(0)
  rows!: ClassSubjectRowDto[];
}
