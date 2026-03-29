import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestDeletionDto {
  @ApiProperty({ description: 'ID of the person to anonymize' })
  @IsUUID()
  personId!: string;

  @ApiProperty({ description: 'School ID for scoping' })
  @IsUUID()
  schoolId!: string;
}
