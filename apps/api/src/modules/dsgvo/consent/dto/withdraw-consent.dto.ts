import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID } from 'class-validator';
import { PROCESSING_PURPOSES, type ProcessingPurposeValue } from './create-consent.dto';

export class WithdrawConsentDto {
  @ApiProperty({ description: 'Person ID to withdraw consent for' })
  @IsUUID()
  personId!: string;

  @ApiProperty({
    description: 'Processing purpose to withdraw consent for',
    enum: PROCESSING_PURPOSES,
  })
  @IsString()
  @IsEnum(PROCESSING_PURPOSES, {
    message: `Unknown processing purpose. Valid purposes: ${PROCESSING_PURPOSES.join(', ')}`,
  })
  purpose!: ProcessingPurposeValue;
}
