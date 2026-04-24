import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Single ClassSubject row in replace-all Wochenstunden editor (SUBJECT-04).
 */
export class ClassSubjectRowDto {
  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ minimum: 0, maximum: 30 })
  @IsInt()
  @Min(0)
  @Max(30)
  weeklyHours!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  preferDoublePeriod?: boolean;
}

export class UpdateClassSubjectsDto {
  @ApiProperty({ type: [ClassSubjectRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassSubjectRowDto)
  @ArrayMinSize(0)
  rows!: ClassSubjectRowDto[];
}
