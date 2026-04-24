import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * Phase 12-01 STUDENT-02 / D-13.1: link an existing Parent to a Student
 * via POST /students/:id/parents. The service refuses to create duplicate
 * ParentStudent rows (idempotent via upsert).
 */
export class AssignParentDto {
  @ApiProperty({ description: 'Existing Parent ID to link', format: 'uuid' })
  @IsUUID()
  parentId!: string;
}
