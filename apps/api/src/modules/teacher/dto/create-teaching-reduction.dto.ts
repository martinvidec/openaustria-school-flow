import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

// Must match Prisma ReductionType enum
enum ReductionTypeDto {
  KUSTODIAT = 'KUSTODIAT',
  KLASSENVORSTAND = 'KLASSENVORSTAND',
  MENTOR = 'MENTOR',
  PERSONALVERTRETUNG = 'PERSONALVERTRETUNG',
  ADMINISTRATION = 'ADMINISTRATION',
  OTHER = 'OTHER',
}

export class CreateTeachingReductionDto {
  @ApiProperty({
    enum: ReductionTypeDto,
    example: 'KUSTODIAT',
    description: 'Type of teaching reduction',
  })
  @IsEnum(ReductionTypeDto)
  reductionType!: ReductionTypeDto;

  @ApiProperty({
    example: 2,
    description: 'Werteinheiten reduction amount',
  })
  @IsNumber()
  @Min(0)
  werteinheiten!: number;

  @ApiPropertyOptional({
    example: 'Physik-Sammlung Kustodiat',
    description: 'Description of the reduction',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'School year this reduction applies to' })
  @IsOptional()
  @IsUUID()
  schoolYearId?: string;
}
