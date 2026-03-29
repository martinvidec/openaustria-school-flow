import { ApiProperty } from '@nestjs/swagger';

export class RetentionPolicyResponseDto {
  @ApiProperty({ description: 'Retention policy ID' })
  id!: string;

  @ApiProperty({ description: 'School ID' })
  schoolId!: string;

  @ApiProperty({ description: 'Data category' })
  dataCategory!: string;

  @ApiProperty({ description: 'Retention period in days' })
  retentionDays!: number;

  @ApiProperty({ description: 'Whether this is a system default' })
  isDefault!: boolean;
}
