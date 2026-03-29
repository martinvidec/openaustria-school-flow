import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';

export class CreateClassDto {
  @ApiProperty({ description: 'School ID', format: 'uuid' })
  @IsUUID()
  schoolId!: string;

  @ApiProperty({ description: 'Class name, e.g. "3B"', example: '3B', minLength: 1, maxLength: 20 })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  name!: string;

  @ApiProperty({ description: 'Year level (1-13)', example: 3, minimum: 1, maximum: 13 })
  @IsInt()
  @Min(1)
  @Max(13)
  yearLevel!: number;

  @ApiProperty({ description: 'School year ID', format: 'uuid' })
  @IsUUID()
  schoolYearId!: string;
}
