import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, MinLength, MaxLength } from 'class-validator';

enum SubjectTypeDto {
  PFLICHT = 'PFLICHT',
  WAHLPFLICHT = 'WAHLPFLICHT',
  FREIGEGENSTAND = 'FREIGEGENSTAND',
  UNVERBINDLICH = 'UNVERBINDLICH',
}

// Issue #69: kept in sync with the Prisma `RoomType` enum
// (apps/api/prisma/schema.prisma). The DTO must list every value the DB
// enum supports so class-validator accepts admin-form input.
enum RoomTypeDto {
  KLASSENZIMMER = 'KLASSENZIMMER',
  TURNSAAL = 'TURNSAAL',
  EDV_RAUM = 'EDV_RAUM',
  WERKRAUM = 'WERKRAUM',
  LABOR = 'LABOR',
  MUSIKRAUM = 'MUSIKRAUM',
}

export class CreateSubjectDto {
  @ApiProperty({ description: 'School ID', example: 'uuid-or-seed-id' })
  // Rule-1 fix (Phase 11 Plan 11-03): accept non-UUID seed IDs (e.g.
  // `seed-school-bgbrg-musterstadt`). The previous `@IsUUID()` decorator
  // was incompatible with the dev-seed data shape and broke the admin UI
  // for /admin/subjects → POST /api/v1/subjects.
  @IsString()
  @MinLength(1)
  schoolId!: string;

  @ApiProperty({ description: 'Full subject name', example: 'Deutsch', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Short name / abbreviation', example: 'D', minLength: 1, maxLength: 10 })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  shortName!: string;

  @ApiProperty({ enum: SubjectTypeDto, description: 'Subject type (Pflicht, Wahlpflicht, etc.)', example: 'PFLICHT' })
  @IsEnum(SubjectTypeDto)
  subjectType!: SubjectTypeDto;

  @ApiPropertyOptional({ description: 'Lehrverpflichtungsgruppe (I, II, III, IV, IVa, V, Va)', example: 'I' })
  @IsOptional()
  @IsString()
  lehrverpflichtungsgruppe?: string;

  @ApiPropertyOptional({ description: 'Werteinheiten factor for teacher workload calculation', example: 1.0 })
  @IsOptional()
  @IsNumber()
  werteinheitenFactor?: number;

  @ApiPropertyOptional({
    enum: RoomTypeDto,
    description:
      'Required room type for lessons of this subject. Drives the solver roomTypeRequirement constraint — see issue #69. Null/omitted = no requirement.',
    example: 'TURNSAAL',
  })
  @IsOptional()
  @IsEnum(RoomTypeDto)
  requiredRoomType?: RoomTypeDto;
}
