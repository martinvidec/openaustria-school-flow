import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditEntryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() action!: string;
  @ApiProperty() resource!: string;
  @ApiPropertyOptional() resourceId!: string | null;
  @ApiProperty() category!: string;
  @ApiPropertyOptional() metadata!: Record<string, unknown> | null;
  @ApiPropertyOptional() ipAddress!: string | null;
  @ApiPropertyOptional() userAgent!: string | null;
  @ApiProperty() createdAt!: Date;
}
