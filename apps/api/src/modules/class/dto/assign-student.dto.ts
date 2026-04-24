import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AssignStudentDto {
  @ApiProperty({ description: 'Student ID to assign' })
  // Plan 12-03 Rule-1: seed student IDs are literal strings, not UUIDs.
  @IsString()
  @MinLength(1)
  studentId!: string;
}
