import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AvailableSchoolDto {
  @ApiProperty({ description: 'School ID this user has a Person row in' })
  schoolId!: string;

  @ApiProperty({ description: 'School display name' })
  schoolName!: string;

  @ApiProperty({ description: 'Person type within this school (TEACHER, STUDENT, PARENT)' })
  personType!: string;
}

export class UserContextResponseDto {
  @ApiProperty({ description: 'Active School ID (first available membership if X-School-Id absent)' })
  schoolId!: string;

  @ApiProperty({
    description:
      'All schools this user has a Person row in. Used by the frontend to populate the schoolId switcher and to send X-School-Id headers.',
    type: [AvailableSchoolDto],
  })
  availableSchools!: AvailableSchoolDto[];

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
