import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestExportDto {
  @ApiProperty({ description: 'ID of the person to export data for' })
  @IsUUID()
  personId!: string;

  @ApiProperty({ description: 'School ID for scoping' })
  @IsUUID()
  schoolId!: string;
}
