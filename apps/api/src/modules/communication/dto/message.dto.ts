import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExcuseReasonEnum } from '../../classbook/dto/excuse.dto';

export class SendMessageDto {
  @ApiProperty({ description: 'Message body text' })
  @IsString()
  @IsNotEmpty()
  body!: string;
}

export class MarkReadDto {
  @ApiProperty({ description: 'Array of message IDs to mark as read', type: [String] })
  @IsArray()
  @IsString({ each: true })
  messageIds!: string[];
}

/**
 * COMM-05: Report absence via messaging.
 * Creates an AbsenceExcuse and sends a SYSTEM message to the Klassenvorstand.
 */
export class ReportAbsenceDto {
  @ApiProperty({ description: 'Student ID to report absence for' })
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({ description: 'Absence start date (ISO-8601)' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ description: 'Absence end date (ISO-8601)' })
  @IsDateString()
  dateTo!: string;

  @ApiProperty({ enum: ExcuseReasonEnum, description: 'Reason category (same as ExcuseReason)' })
  @IsEnum(ExcuseReasonEnum)
  reason!: ExcuseReasonEnum;

  @ApiPropertyOptional({ description: 'Optional free-text note' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
