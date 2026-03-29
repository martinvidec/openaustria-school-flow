import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';

export enum GroupTypeDto {
  RELIGION = 'RELIGION',
  WAHLPFLICHT = 'WAHLPFLICHT',
  LEISTUNG = 'LEISTUNG',
  LANGUAGE = 'LANGUAGE',
  CUSTOM = 'CUSTOM',
}

export class CreateGroupDto {
  @ApiProperty({ description: 'Class ID this group belongs to', format: 'uuid' })
  @IsUUID()
  classId!: string;

  @ApiProperty({ description: 'Group name', example: '3B-Ethik', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: GroupTypeDto, description: 'Group type', example: 'RELIGION' })
  @IsEnum(GroupTypeDto)
  groupType!: GroupTypeDto;

  @ApiPropertyOptional({ description: 'Performance level for LEISTUNG groups: Standard or AHS (D-08)', example: 'Standard' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({ description: 'Subject ID for WAHLPFLICHT groups (D-10)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;
}
