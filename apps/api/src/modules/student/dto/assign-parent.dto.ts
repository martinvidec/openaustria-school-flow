import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/**
 * Phase 12-01 STUDENT-02 / D-13.1: link an existing Parent to a Student
 * via POST /students/:id/parents. The service refuses to create duplicate
 * ParentStudent rows (idempotent via upsert).
 *
 * Plan 12-03 Rule-1 fix: `@IsUUID()` rejected seed Parent IDs (literal
 * strings). Mirrors the Phase 11 Plan 11-03 precedent; Prisma keys are the
 * uniqueness contract, not RFC 4122 UUIDs.
 */
export class AssignParentDto {
  @ApiProperty({ description: 'Existing Parent ID to link' })
  @IsString()
  @MinLength(1)
  parentId!: string;
}
