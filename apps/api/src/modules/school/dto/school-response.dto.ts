import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Phase 10.1 Bug 2: nested address object shape mirrors CreateSchoolDto.AddressDto
// and @schoolflow/shared AddressSchema — single source of truth across the wire.
export class AddressResponseDto {
  @ApiProperty() street!: string;
  @ApiProperty() zip!: string;
  @ApiProperty() city!: string;
}

export class PeriodResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() periodNumber!: number;
  @ApiProperty() startTime!: string;
  @ApiProperty() endTime!: string;
  @ApiProperty() isBreak!: boolean;
  @ApiPropertyOptional() label!: string | null;
  @ApiProperty() durationMin!: number;
}

export class TimeGridResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: [PeriodResponseDto] }) periods!: PeriodResponseDto[];
}

export class HolidayResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() startDate!: Date;
  @ApiProperty() endDate!: Date;
}

export class AutonomousDayResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() date!: Date;
  @ApiPropertyOptional() reason!: string | null;
}

export class SchoolYearResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() startDate!: Date;
  @ApiProperty() semesterBreak!: Date;
  @ApiProperty() endDate!: Date;
  // Phase 10 Plan 01a: SCHOOL-03 multi-active flag (partial unique per school).
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: [HolidayResponseDto] }) holidays!: HolidayResponseDto[];
  @ApiProperty({ type: [AutonomousDayResponseDto] }) autonomousDays!: AutonomousDayResponseDto[];
}

export class SchoolDayResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() dayOfWeek!: string;
  @ApiProperty() isActive!: boolean;
}

export class SchoolResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() schoolType!: string;
  @ApiPropertyOptional({ type: AddressResponseDto }) address!: AddressResponseDto | null;
  // Phase 10 Plan 01a: SCHOOL-04 A/B-week default for new TimetableRuns.
  @ApiProperty() abWeekEnabled!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional({ type: TimeGridResponseDto }) timeGrid!: TimeGridResponseDto | null;
  // Phase 10 Plan 01a: multi-active migration — SchoolYear is now a list per school.
  // Plan 02 will expose richer SchoolYear endpoints; for now surface all years.
  @ApiProperty({ type: [SchoolYearResponseDto] }) schoolYears!: SchoolYearResponseDto[];
  @ApiProperty({ type: [SchoolDayResponseDto] }) schoolDays!: SchoolDayResponseDto[];
}
