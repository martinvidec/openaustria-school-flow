import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsUUID,
  IsInt,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { CreateAvailabilityRuleDto } from './create-availability-rule.dto';
import { CreateTeachingReductionDto } from './create-teaching-reduction.dto';

export class CreateTeacherDto {
  @ApiProperty({ description: 'School this teacher belongs to' })
  // Phase 11 Plan 11-03 Rule-1 fix: the seed fixture uses literal string IDs
  // (e.g. `seed-school-bgbrg-musterstadt`) which are valid Prisma keys but not
  // RFC 4122 UUIDs. `@IsUUID()` rejects them with 422 and breaks the admin UI
  // for any seed-hosted dev environment. `@IsString() @MinLength(1)` preserves
  // the non-null guard without over-constraining the key format.
  @IsString()
  @MinLength(1)
  schoolId!: string;

  @ApiProperty({ example: 'Maria', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Huber', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ example: 'maria.huber@schule.at' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+43 1 234 5678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Schulstrasse 1, 1010 Wien' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Date of birth (stored as string for encryption compatibility)',
    example: '1985-03-15',
  })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Social security number (encrypted at rest)' })
  @IsOptional()
  @IsString()
  socialSecurityNumber?: string;

  @ApiPropertyOptional({ description: 'Austrian Personalverwaltungsnummer' })
  @IsOptional()
  @IsString()
  personalNumber?: string;

  @ApiPropertyOptional({ description: 'Years of teaching service', example: 12 })
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsOfService?: number;

  @ApiPropertyOptional({ description: 'Pragmatisierung (permanent civil servant)', default: false })
  @IsOptional()
  @IsBoolean()
  isPermanent?: boolean;

  @ApiPropertyOptional({
    description: 'Employment percentage (100 = full-time)',
    example: 100,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  employmentPercentage?: number;

  @ApiPropertyOptional({ description: 'Shared teacher (Wanderlehrer) across schools', default: false })
  @IsOptional()
  @IsBoolean()
  isShared?: boolean;

  @ApiPropertyOptional({ description: 'Home school ID for shared teachers (Stammschule)' })
  @IsOptional()
  // Rule-1 fix (Phase 11 Plan 11-03): parity with `schoolId` — accept non-UUID
  // seed IDs without compromising non-empty validation.
  @IsString()
  @MinLength(1)
  homeSchoolId?: string;

  @ApiPropertyOptional({
    description: 'Werteinheiten target for this teacher (default 20 for full-time)',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  werteinheitenTarget?: number;

  @ApiPropertyOptional({
    description: 'Subject IDs this teacher is qualified to teach (D-05)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  subjectIds?: string[];

  @ApiPropertyOptional({
    description: 'Availability constraint rules for timetable solver',
    type: [CreateAvailabilityRuleDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityRuleDto)
  availabilityRules?: CreateAvailabilityRuleDto[];

  @ApiPropertyOptional({
    description: 'Teaching reductions (Kustodiat, Klassenvorstand, etc.)',
    type: [CreateTeachingReductionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTeachingReductionDto)
  reductions?: CreateTeachingReductionDto[];
}
