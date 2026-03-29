import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionOverrideResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() action!: string;
  @ApiProperty() subject!: string;
  @ApiPropertyOptional() conditions!: Record<string, unknown> | null;
  @ApiProperty() granted!: boolean;
  @ApiProperty() grantedBy!: string;
  @ApiProperty() createdAt!: Date;
}
