import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, MinLength, MaxLength, IsBoolean, Matches } from 'class-validator';
import { SCHOOL_TYPES } from '@schoolflow/shared';
import { CreateTimeGridDto } from './create-time-grid.dto';
import { CreateSchoolYearDto } from './create-school-year.dto';

// Phase 10.1 Bug 1 fix: SchoolTypeDto is derived from @schoolflow/shared SCHOOL_TYPES
// (the single source of truth shared with the frontend Zod schema + Prisma SchoolType enum).
// The Prisma enum additionally retains 3 legacy values (MS, AHS_UNTER, AHS_OBER) for
// back-compat with existing seed rows, but new schools should only use these 7 values.
// @IsEnum accepts an object whose values are the allowed string literals.
const SchoolTypeDto = Object.freeze(
  Object.fromEntries(SCHOOL_TYPES.map((t) => [t, t])),
) as { readonly [K in (typeof SCHOOL_TYPES)[number]]: K };
type SchoolTypeDto = (typeof SCHOOL_TYPES)[number];

// Must match Prisma DayOfWeek enum
enum DayOfWeekDto {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
}

// Phase 10.1 Bug 2 fix: address is a nested {street, zip, city} object — must
// match @schoolflow/shared AddressSchema (Zod). PLZ regex mirrors the Zod form:
// 4-digit (Austrian) or 5-digit (German) postal codes per UI-SPEC §3.2 DACH scope.
export class AddressDto {
  @ApiProperty({ example: 'Amerlingstrasse 6' })
  @IsString()
  @MinLength(1, { message: 'Pflichtfeld' })
  street!: string;

  @ApiProperty({ example: '1060', description: 'AT 4-digit or DE 5-digit postal code' })
  @IsString()
  @Matches(/^\d{4,5}$/, { message: 'PLZ muss 4 oder 5 Ziffern haben' })
  zip!: string;

  @ApiProperty({ example: 'Wien' })
  @IsString()
  @MinLength(1, { message: 'Pflichtfeld' })
  city!: string;
}

export class CreateSchoolDto {
  @ApiProperty({ example: 'BG/BRG Wien Amerlingstrasse', minLength: 3, maxLength: 200 })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: SCHOOL_TYPES, example: 'AHS' })
  @IsEnum(SchoolTypeDto)
  schoolType!: SchoolTypeDto;

  @ApiPropertyOptional({ type: AddressDto, description: 'UI-SPEC §3.2 — nested {street, zip, city}' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({ description: 'School days (defaults to Mo-Fr)', enum: DayOfWeekDto, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeekDto, { each: true })
  schoolDays?: DayOfWeekDto[];

  @ApiPropertyOptional({ description: 'Time grid with periods. If omitted, template for schoolType is used.', type: CreateTimeGridDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTimeGridDto)
  timeGrid?: CreateTimeGridDto;

  @ApiPropertyOptional({ description: 'School year structure', type: CreateSchoolYearDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateSchoolYearDto)
  schoolYear?: CreateSchoolYearDto;

  @ApiPropertyOptional({ description: 'If true, use predefined template for the schoolType instead of custom timeGrid', default: true })
  @IsOptional()
  @IsBoolean()
  useTemplate?: boolean;

  @ApiPropertyOptional({
    description: 'A/B-Wochen-Modus default for new TimetableRuns (D-04 / SCHOOL-04).',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  abWeekEnabled?: boolean;
}
