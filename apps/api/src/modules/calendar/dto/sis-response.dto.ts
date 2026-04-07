import { ApiProperty } from '@nestjs/swagger';

export class SisStudentDto {
  @ApiProperty({ description: 'Student ID' })
  id!: string;

  @ApiProperty({ description: 'First name' })
  firstName!: string;

  @ApiProperty({ description: 'Last name' })
  lastName!: string;

  @ApiProperty({ description: 'Class name (e.g. 1A)' })
  className!: string;
}

export class SisTeacherDto {
  @ApiProperty({ description: 'Teacher ID' })
  id!: string;

  @ApiProperty({ description: 'First name' })
  firstName!: string;

  @ApiProperty({ description: 'Last name' })
  lastName!: string;

  @ApiProperty({ description: 'Subjects taught' })
  subjects!: string[];
}

export class SisClassDto {
  @ApiProperty({ description: 'Class ID' })
  id!: string;

  @ApiProperty({ description: 'Class name (e.g. 1A)' })
  name!: string;

  @ApiProperty({ description: 'Year level' })
  level!: number;

  @ApiProperty({ description: 'Number of students in the class' })
  studentCount!: number;
}

export class SisApiKeyResponseDto {
  @ApiProperty({ description: 'API key record ID' })
  id!: string;

  @ApiProperty({ description: 'Human-readable name for the key' })
  name!: string;

  @ApiProperty({ description: 'Whether the key is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Last time the key was used', nullable: true })
  lastUsed!: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: string;

  @ApiProperty({ description: 'Only returned at creation time', required: false })
  key?: string;
}
