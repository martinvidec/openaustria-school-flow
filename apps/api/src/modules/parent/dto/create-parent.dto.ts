import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * Phase 12-01 STUDENT-02 / D-13.1: create a Parent with nested Person
 * (personType=PARENT). All fields required by 12-UI-SPEC.md §Stammdaten Tab
 * for the InlineCreateParentForm.
 */
export class CreateParentDto {
  @ApiProperty({ format: 'uuid', description: 'School ID (tenant scope)' })
  @IsUUID()
  schoolId!: string;

  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ format: 'email' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}
