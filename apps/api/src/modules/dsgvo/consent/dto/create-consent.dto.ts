import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export const PROCESSING_PURPOSES = [
  'STUNDENPLANERSTELLUNG',
  'KOMMUNIKATION',
  'NOTENVERARBEITUNG',
  'FOTOFREIGABE',
  'KONTAKTDATEN_WEITERGABE',
  'LERNPLATTFORM',
  'STATISTIK',
] as const;

export type ProcessingPurposeValue = (typeof PROCESSING_PURPOSES)[number];

export const LEGAL_BASES = [
  'consent',
  'legal_obligation',
  'legitimate_interest',
  'contract',
  'vital_interest',
  'public_interest',
] as const;

export type LegalBasisValue = (typeof LEGAL_BASES)[number];

export class CreateConsentDto {
  @ApiProperty({ description: 'Person ID to record consent for' })
  @IsUUID()
  personId!: string;

  @ApiProperty({
    description: 'Processing purpose per DSGVO Zweckbindung',
    enum: PROCESSING_PURPOSES,
  })
  @IsString()
  @IsEnum(PROCESSING_PURPOSES, {
    message: `Unknown processing purpose. Valid purposes: ${PROCESSING_PURPOSES.join(', ')}`,
  })
  purpose!: ProcessingPurposeValue;

  @ApiProperty({ description: 'Whether consent is granted' })
  @IsBoolean()
  granted!: boolean;

  @ApiPropertyOptional({ description: 'Consent version', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({
    description: 'Legal basis for processing',
    enum: LEGAL_BASES,
  })
  @IsOptional()
  @IsString()
  @IsEnum(LEGAL_BASES)
  legalBasis?: LegalBasisValue;
}
