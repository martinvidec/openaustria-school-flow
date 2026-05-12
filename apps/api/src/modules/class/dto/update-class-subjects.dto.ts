import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  ValidateIf,
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

  // Issue #71: optional Teacher assignment per ClassSubject row. null
  // explicitly clears the assignment, undefined leaves it unchanged.
  // ValidateIf gate is needed because @IsString rejects null.
  @ApiPropertyOptional({
    nullable: true,
    description:
      'Teacher assigned to teach this subject in this class. Drives the solver teacherConflict + teacherAvailability constraints (issue #71). Pass null to clear.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MinLength(1)
  teacherId?: string | null;

  // Issue #72: week rhythm. cycleLength=1 means "every week" (the
  // historical default). cycleLength=2 + cycleSlotMask=1 → A-week only;
  // mask=2 → B-week only. Schema is forward-compatible for n>2 but the
  // API today validates the A/B subset.
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 2,
    description:
      'Cycle length in weeks. 1 = every week; 2 = A/B rhythm. Issue #72.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2)
  cycleLength?: number;

  @ApiPropertyOptional({
    nullable: true,
    minimum: 1,
    maximum: 3,
    description:
      'Bitmask selecting which slots in the cycle the subject is active. Required when cycleLength > 1; must be null when cycleLength == 1. For cycleLength=2: 1 = A-week, 2 = B-week. Issue #72.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(3)
  cycleSlotMask?: number | null;
}

export class UpdateClassSubjectsDto {
  @ApiProperty({ type: [ClassSubjectRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassSubjectRowDto)
  @ArrayMinSize(0)
  rows!: ClassSubjectRowDto[];
}
