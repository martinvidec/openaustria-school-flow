import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStudentDto {
  @ApiProperty({ description: 'School ID' })
  // Phase 12 Plan 12-03 Rule-1 fix (parity with Phase 11 Plan 11-03): seed
  // fixture school IDs (e.g. `seed-school-bgbrg-musterstadt`) are valid
  // Prisma keys but not RFC 4122 UUIDs. `@IsUUID()` rejects them with 422
  // and breaks any seed-hosted dev environment. `@IsString() @MinLength(1)`
  // preserves the non-null guard without over-constraining the key format.
  @IsString()
  @MinLength(1)
  schoolId!: string;

  @ApiProperty({ description: 'First name', example: 'Maria', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ description: 'Last name', example: 'Huber', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ description: 'Email address', example: 'maria.huber@schule.at' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Home address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Austrian social security number (encrypted)' })
  @IsOptional()
  @IsString()
  socialSecurityNumber?: string;

  @ApiPropertyOptional({ description: 'Student number (Schueler-ID)' })
  @IsOptional()
  @IsString()
  studentNumber?: string;

  @ApiPropertyOptional({ description: 'Stammklasse assignment' })
  @IsOptional()
  // Phase 12 Plan 12-03 Rule-1 fix: same rationale as schoolId — seed class
  // IDs are literal strings, not UUIDs.
  @IsString()
  @MinLength(1)
  classId?: string;

  @ApiPropertyOptional({ description: 'Enrollment date', example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;

  /**
   * Phase 12-01 STUDENT-02 / D-13.1: optional parent IDs to link on create.
   * The service creates ParentStudent rows inside the same Prisma transaction
   * as the Student. Zero/undefined == no ParentStudent rows (backward-compat).
   */
  @ApiPropertyOptional({ description: 'Parent IDs to link on create', type: [String] })
  @IsOptional()
  @IsArray()
  // Phase 12 Plan 12-03 Rule-1 fix: allow non-UUID seed IDs via string guard.
  @IsString({ each: true })
  parentIds?: string[];
}
