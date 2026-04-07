import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ConversationScope } from '@schoolflow/shared';
import { CreatePollDto } from './poll.dto';

const CONVERSATION_SCOPE_VALUES = [
  'DIRECT',
  'CLASS',
  'YEAR_GROUP',
  'SCHOOL',
] as const;

export class CreateConversationDto {
  @ApiProperty({ enum: CONVERSATION_SCOPE_VALUES })
  @IsEnum(CONVERSATION_SCOPE_VALUES)
  scope!: ConversationScope;

  @ApiPropertyOptional({ description: 'classId for CLASS, yearLevel for YEAR_GROUP' })
  @IsOptional()
  @IsString()
  scopeId?: string;

  @ApiPropertyOptional({ description: 'Subject line (required for broadcasts)' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'First message body' })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({ description: 'Optional poll data for the first message' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePollDto)
  pollData?: CreatePollDto;
}
