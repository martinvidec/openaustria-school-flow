import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeletionStatusResponseDto {
  @ApiProperty({ description: 'DSGVO job ID' })
  id!: string;

  @ApiProperty({ description: 'Person ID associated with deletion' })
  personId!: string | null;

  @ApiProperty({ description: 'Job type', enum: ['DATA_DELETION'] })
  jobType!: string;

  @ApiProperty({ description: 'Current status', enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'] })
  status!: string;

  @ApiProperty({ description: 'When the job was created' })
  createdAt!: Date;

  @ApiPropertyOptional({ description: 'Error message if job failed' })
  errorMessage?: string | null;
}
