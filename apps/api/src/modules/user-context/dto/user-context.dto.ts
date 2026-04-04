import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserContextResponseDto {
  @ApiProperty({ description: 'School ID the user belongs to' })
  schoolId!: string;

  @ApiProperty({ description: 'Person record ID' })
  personId!: string;

  @ApiProperty({ description: 'Person type: TEACHER, STUDENT, or PARENT' })
  personType!: string;

  @ApiProperty({ description: 'First name' })
  firstName!: string;

  @ApiProperty({ description: 'Last name' })
  lastName!: string;

  @ApiPropertyOptional({ description: 'Teacher ID (if person is a teacher)' })
  teacherId?: string;

  @ApiPropertyOptional({ description: 'Student ID (if person is a student)' })
  studentId?: string;

  @ApiPropertyOptional({ description: 'Class ID (if person is a student assigned to a class)' })
  classId?: string;

  @ApiPropertyOptional({ description: 'Class name (if person is a student assigned to a class)' })
  className?: string;

  @ApiPropertyOptional({ description: 'Parent ID (if person is a parent)' })
  parentId?: string;

  @ApiPropertyOptional({ description: 'First child class ID (if person is a parent)' })
  childClassId?: string;

  @ApiPropertyOptional({ description: 'First child class name (if person is a parent)' })
  childClassName?: string;

  @ApiPropertyOptional({ description: 'First child student name (if person is a parent)' })
  childStudentName?: string;

  @ApiPropertyOptional({ description: 'All children (if person is a parent)' })
  children?: Array<{ studentId: string; studentName: string; classId: string; className: string }>;
}
