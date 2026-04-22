import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class KeycloakUserQueryDto {
  @ApiProperty({
    description: 'Email fragment (>=3 chars). Matches Keycloak user search (case-insensitive).',
    example: 'maria.huber',
  })
  @IsString()
  @MinLength(3)
  email!: string;
}
