import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LinkKeycloakDto {
  @ApiProperty({
    description: 'Keycloak user ID (the `sub` claim from the OIDC access token)',
    example: '8f14e45f-ceea-4e0f-b4e1-5d6e7f8a9b0c',
  })
  @IsString()
  @MinLength(1)
  keycloakUserId!: string;
}
