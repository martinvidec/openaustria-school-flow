import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignSubstituteDto {
  @ApiProperty({ description: 'Candidate teacher ID to assign as substitute' })
  @IsUUID()
  candidateTeacherId!: string;
}

export class RespondToOfferDto {
  @ApiProperty({ description: 'Whether the teacher accepts the substitution offer' })
  @IsBoolean()
  accept!: boolean;

  @ApiPropertyOptional({ description: 'Optional reason when declining an offer', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declineReason?: string;
}

export class SetStillarbeitDto {
  @ApiPropertyOptional({ description: 'Optional supervisor teacher ID (D-04)' })
  @IsOptional()
  @IsUUID()
  supervisorTeacherId?: string;
}
