import { IsString, IsEnum, IsObject, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Supported constraint template types.
 * Each maps to a solver constraint:
 * - BLOCK_TIMESLOT: Block specific time slots for a teacher (maps to TeacherAvailability)
 * - SUBJECT_MORNING: Subject should be scheduled in morning periods (maps to SubjectTimePreference)
 * - NO_LESSONS_AFTER: No lessons after period N for a class (maps to ClassTimeslotRestriction)
 * - SUBJECT_PREFERRED_SLOT: Subject preferred in a specific slot (future extension)
 */
export enum ConstraintTemplateType {
  BLOCK_TIMESLOT = 'BLOCK_TIMESLOT',
  SUBJECT_MORNING = 'SUBJECT_MORNING',
  NO_LESSONS_AFTER = 'NO_LESSONS_AFTER',
  SUBJECT_PREFERRED_SLOT = 'SUBJECT_PREFERRED_SLOT',
}

/**
 * DTO for creating a new constraint template.
 *
 * Params structure varies by templateType:
 * - BLOCK_TIMESLOT: { teacherId: string, dayOfWeek: string, periods: number[] }
 * - SUBJECT_MORNING: { subjectId: string, maxPeriod: number }
 * - NO_LESSONS_AFTER: { classId: string, maxPeriod: number }
 * - SUBJECT_PREFERRED_SLOT: { subjectId: string, dayOfWeek: string, period: number }
 */
export class CreateConstraintTemplateDto {
  @IsEnum(ConstraintTemplateType)
  @ApiProperty({
    enum: ConstraintTemplateType,
    description: 'Type of constraint template',
    example: ConstraintTemplateType.NO_LESSONS_AFTER,
  })
  templateType!: ConstraintTemplateType;

  @IsObject()
  @ApiProperty({
    description: 'Template parameters (structure depends on templateType)',
    example: { classId: 'class-1a', maxPeriod: 5 },
  })
  params!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Whether the template is active (default: true)',
    default: true,
  })
  isActive?: boolean;
}

/**
 * DTO for updating an existing constraint template.
 * Only params and isActive can be changed (templateType is immutable).
 */
export class UpdateConstraintTemplateDto {
  @IsOptional()
  @IsObject()
  @ApiPropertyOptional({
    description: 'Updated template parameters',
  })
  params?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Whether the template is active',
  })
  isActive?: boolean;
}

/**
 * DTO for inline isActive toggle (Phase 14 D-11 / UI-SPEC §Restriction CRUD §7).
 * Used by PATCH /:id/active so audit can capture the focused toggle as a
 * distinct action vs full PUT update.
 */
export class SetActiveDto {
  @IsBoolean()
  @ApiProperty({
    description: 'New isActive state for the constraint template',
    example: false,
  })
  isActive!: boolean;
}

/**
 * Response DTO for constraint template queries.
 */
export class ConstraintTemplateResponseDto {
  id!: string;
  schoolId!: string;
  templateType!: string;
  params!: Record<string, unknown>;
  isActive!: boolean;
  createdAt!: Date;
}
