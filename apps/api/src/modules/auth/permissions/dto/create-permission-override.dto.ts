import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';

export class CreatePermissionOverrideDto {
  @ApiProperty({ description: 'Keycloak user ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  userId!: string;

  @ApiProperty({ description: 'Permission action', example: 'read', enum: ['create', 'read', 'update', 'delete', 'manage'] })
  @IsString()
  action!: string;

  @ApiProperty({ description: 'Permission subject', example: 'grades' })
  @IsString()
  subject!: string;

  @ApiPropertyOptional({ description: 'Condition object for scoped access', example: { userId: '{{ id }}' } })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;

  @ApiProperty({ description: 'true = grant permission, false = deny permission', example: true })
  @IsBoolean()
  granted!: boolean;
}
