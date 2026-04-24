import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export type GroupTypeString = 'RELIGION' | 'WAHLPFLICHT' | 'LEISTUNG' | 'LANGUAGE' | 'CUSTOM';

const GROUP_TYPES = ['RELIGION', 'WAHLPFLICHT', 'LEISTUNG', 'LANGUAGE', 'CUSTOM'] as const;

export class CreateGroupDerivationRuleDto {
  @ApiProperty({ enum: GROUP_TYPES })
  @IsEnum(GROUP_TYPES)
  groupType!: GroupTypeString;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  groupName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  level?: string;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds?: string[];
}
