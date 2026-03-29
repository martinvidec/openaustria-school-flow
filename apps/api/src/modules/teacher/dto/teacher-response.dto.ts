import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PersonResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiPropertyOptional() email!: string | null;
  @ApiPropertyOptional() phone!: string | null;
  @ApiPropertyOptional() address!: string | null;
  @ApiPropertyOptional() dateOfBirth!: string | null;
  @ApiPropertyOptional() socialSecurityNumber!: string | null;
  @ApiProperty() personType!: string;
}

export class SubjectResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() shortName!: string;
  @ApiProperty() subjectType!: string;
  @ApiPropertyOptional() lehrverpflichtungsgruppe!: string | null;
  @ApiPropertyOptional() werteinheitenFactor!: number | null;
}

export class TeacherSubjectResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() subjectId!: string;
  @ApiProperty({ type: SubjectResponseDto }) subject!: SubjectResponseDto;
}

export class AvailabilityRuleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() ruleType!: string;
  @ApiPropertyOptional() dayOfWeek!: string | null;
  @ApiProperty({ type: [Number] }) periodNumbers!: number[];
  @ApiPropertyOptional() maxValue!: number | null;
  @ApiPropertyOptional() dayPart!: string | null;
  @ApiProperty() isHard!: boolean;
}

export class TeachingReductionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() reductionType!: string;
  @ApiProperty() werteinheiten!: number;
  @ApiPropertyOptional() description!: string | null;
  @ApiPropertyOptional() schoolYearId!: string | null;
}

export class TeacherResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() personId!: string;
  @ApiProperty() schoolId!: string;
  @ApiPropertyOptional() personalNumber!: string | null;
  @ApiPropertyOptional() yearsOfService!: number | null;
  @ApiProperty() isPermanent!: boolean;
  @ApiProperty() employmentPercentage!: number;
  @ApiProperty() isShared!: boolean;
  @ApiPropertyOptional() homeSchoolId!: string | null;
  @ApiProperty() werteinheitenTarget!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  @ApiProperty({ type: PersonResponseDto })
  person!: PersonResponseDto;

  @ApiProperty({ type: [TeacherSubjectResponseDto] })
  qualifications!: TeacherSubjectResponseDto[];

  @ApiProperty({ type: [AvailabilityRuleResponseDto] })
  availabilityRules!: AvailabilityRuleResponseDto[];

  @ApiProperty({ type: [TeachingReductionResponseDto] })
  reductions!: TeachingReductionResponseDto[];
}

export class TeacherCapacityResponseDto {
  @ApiProperty({ description: 'Total Werteinheiten target for this teacher' })
  werteinheitenTarget!: number;

  @ApiProperty({ description: 'Sum of all teaching reductions in Werteinheiten' })
  totalReductions!: number;

  @ApiProperty({ description: 'Effective Werteinheiten available for teaching' })
  effectiveWerteinheiten!: number;

  @ApiProperty({ description: 'Maximum weekly teaching hours after reductions' })
  maxWeeklyHours!: number;
}
