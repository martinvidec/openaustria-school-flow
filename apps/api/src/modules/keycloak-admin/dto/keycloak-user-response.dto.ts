import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class KeycloakUserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() enabled!: boolean;

  @ApiPropertyOptional({
    description: 'If this KC user is already linked to a SchoolFlow Person, its ID.',
  })
  alreadyLinkedToPersonId?: string;

  @ApiPropertyOptional({
    description: 'Display name of the already-linked Person (for the UI warning).',
  })
  alreadyLinkedToPersonName?: string;
}
