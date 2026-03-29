import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GroupSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() groupType!: string;
  @ApiPropertyOptional() level?: string | null;
}

export class ClassResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() schoolId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() yearLevel!: number;
  @ApiProperty() schoolYearId!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ description: 'Number of students in this class' })
  _count?: { students: number };
  @ApiPropertyOptional({ type: [GroupSummaryDto] }) groups?: GroupSummaryDto[];
}
