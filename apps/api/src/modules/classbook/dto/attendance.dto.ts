import { IsString, IsEnum, IsOptional, IsInt, Min, Max, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AttendanceStatusEnum {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

export class AttendanceRecordItemDto {
  @ApiProperty()
  @IsString()
  studentId!: string;

  @ApiProperty({ enum: AttendanceStatusEnum })
  @IsEnum(AttendanceStatusEnum)
  status!: AttendanceStatusEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  lateMinutes?: number;
}

export class BulkAttendanceDto {
  @ApiProperty({ type: [AttendanceRecordItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordItemDto)
  records!: AttendanceRecordItemDto[];
}

export class CreateClassBookEntryDto {
  @ApiProperty({ description: 'ClassSubject ID' })
  @IsString()
  classSubjectId!: string;

  @ApiProperty({ description: 'Actual calendar date (ISO)' })
  @IsDateString()
  date!: string;

  @ApiProperty({ description: 'Day of week', enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] })
  @IsString()
  dayOfWeek!: string;

  @ApiProperty({ description: 'Period number (1-based)' })
  @IsInt()
  @Min(1)
  @Max(20)
  periodNumber!: number;

  @ApiPropertyOptional({ description: 'Week type (BOTH, A, B)', default: 'BOTH' })
  @IsOptional()
  @IsString()
  weekType?: string;
}
