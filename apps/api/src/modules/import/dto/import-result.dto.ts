import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for ImportJob result -- returned from GET endpoints.
 * Mirrors ImportJob Prisma model fields.
 */
export class ImportResultDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  schoolId!: string;

  @ApiProperty()
  fileType!: string;

  @ApiProperty()
  entityType!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  conflictMode!: string;

  @ApiPropertyOptional()
  columnMapping!: Record<string, string> | null;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  bullmqJobId!: string | null;

  @ApiPropertyOptional()
  totalRows!: number | null;

  @ApiPropertyOptional()
  importedRows!: number | null;

  @ApiPropertyOptional()
  skippedRows!: number | null;

  @ApiPropertyOptional()
  errorRows!: number | null;

  @ApiPropertyOptional()
  errorDetails!: unknown[] | null;

  @ApiPropertyOptional()
  dryRunResult!: unknown | null;

  @ApiProperty()
  createdBy!: string;

  @ApiPropertyOptional()
  startedAt!: string | null;

  @ApiPropertyOptional()
  completedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}
