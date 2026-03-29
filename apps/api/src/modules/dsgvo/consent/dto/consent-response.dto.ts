import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConsentResponseDto {
  @ApiProperty({ description: 'Consent record ID' })
  id!: string;

  @ApiProperty({ description: 'Person ID' })
  personId!: string;

  @ApiProperty({ description: 'Processing purpose' })
  purpose!: string;

  @ApiProperty({ description: 'Whether consent is currently granted' })
  granted!: boolean;

  @ApiProperty({ description: 'Consent version number' })
  version!: number;

  @ApiPropertyOptional({ description: 'Timestamp when consent was granted' })
  grantedAt!: Date | null;

  @ApiPropertyOptional({ description: 'Timestamp when consent was withdrawn' })
  withdrawnAt!: Date | null;

  @ApiPropertyOptional({ description: 'Legal basis for processing' })
  legalBasis!: string | null;

  @ApiProperty({ description: 'Record creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Record last update timestamp' })
  updatedAt!: Date;
}
