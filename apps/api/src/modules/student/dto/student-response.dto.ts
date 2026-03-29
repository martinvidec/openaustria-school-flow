import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PersonResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiPropertyOptional() email?: string | null;
  @ApiPropertyOptional() phone?: string | null;
  @ApiPropertyOptional() address?: string | null;
  @ApiPropertyOptional() dateOfBirth?: string | null;
}

export class ClassSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() yearLevel!: number;
}

export class StudentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() personId!: string;
  @ApiProperty() schoolId!: string;
  @ApiPropertyOptional() classId?: string | null;
  @ApiPropertyOptional() studentNumber?: string | null;
  @ApiPropertyOptional() enrollmentDate?: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ type: PersonResponseDto }) person!: PersonResponseDto;
  @ApiPropertyOptional({ type: ClassSummaryDto }) schoolClass?: ClassSummaryDto | null;
}
