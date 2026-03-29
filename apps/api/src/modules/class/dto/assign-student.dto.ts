import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignStudentDto {
  @ApiProperty({ description: 'Student ID to assign', format: 'uuid' })
  @IsUUID()
  studentId!: string;
}
