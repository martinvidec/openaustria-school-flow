import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PollType } from '@schoolflow/shared';

const POLL_TYPE_VALUES = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE'] as const;

export class CreatePollDto {
  @ApiProperty({ description: 'Poll question text' })
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiProperty({ enum: POLL_TYPE_VALUES })
  @IsEnum(POLL_TYPE_VALUES)
  type!: PollType;

  @ApiProperty({ description: 'Array of option texts (minimum 2)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  options!: string[];

  @ApiPropertyOptional({ description: 'Poll deadline (ISO-8601 date string)' })
  @IsOptional()
  @IsDateString()
  deadline?: string;
}

export class CastVoteDto {
  @ApiProperty({ description: 'Array of option IDs to vote for', type: [String] })
  @IsArray()
  @IsString({ each: true })
  optionIds!: string[];
}
