import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsUUID, Max, Min } from 'class-validator';

enum SchoolTypeDto {
  VS = 'VS',
  MS = 'MS',
  AHS_UNTER = 'AHS_UNTER',
  AHS_OBER = 'AHS_OBER',
  BHS = 'BHS',
}

export class ApplyStundentafelDto {
  @ApiProperty({ description: 'School ID' })
  @IsUUID()
  schoolId!: string;

  @ApiProperty({ description: 'Class ID to apply template to' })
  @IsUUID()
  classId!: string;

  @ApiProperty({ enum: SchoolTypeDto, description: 'School type for template lookup', example: 'AHS_UNTER' })
  @IsEnum(SchoolTypeDto)
  schoolType!: SchoolTypeDto;

  @ApiProperty({ description: 'Year level (1-13)', example: 1, minimum: 1, maximum: 13 })
  @IsInt()
  @Min(1)
  @Max(13)
  yearLevel!: number;
}
