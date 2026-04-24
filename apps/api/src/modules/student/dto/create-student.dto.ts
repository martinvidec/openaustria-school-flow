import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStudentDto {
  @ApiProperty({ description: 'School ID', format: 'uuid' })
  @IsUUID()
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

  @ApiPropertyOptional({ description: 'Stammklasse assignment', format: 'uuid' })
  @IsOptional()
  @IsUUID()
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
  @ApiPropertyOptional({ description: 'Parent IDs to link on create', type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  parentIds?: string[];
}
