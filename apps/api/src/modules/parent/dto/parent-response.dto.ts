import { ApiProperty } from '@nestjs/swagger';

/**
 * Phase 12-01 STUDENT-02 / D-13.1: shape returned by GET /parents/:id and
 * GET /parents. Not used directly (controllers return raw Prisma rows via
 * include: person + children) — kept for Swagger documentation parity with
 * Phase 11 patterns.
 */
export class ParentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() schoolId!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ required: false, nullable: true }) phone?: string | null;
  @ApiProperty({ type: [String], description: 'Linked student IDs' }) linkedStudentIds!: string[];
}
