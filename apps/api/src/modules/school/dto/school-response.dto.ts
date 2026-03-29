import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @ApiPropertyOptional() address!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional({ type: TimeGridResponseDto }) timeGrid!: TimeGridResponseDto | null;
  @ApiPropertyOptional({ type: SchoolYearResponseDto }) schoolYear!: SchoolYearResponseDto | null;
  @ApiProperty({ type: [SchoolDayResponseDto] }) schoolDays!: SchoolDayResponseDto[];
}
