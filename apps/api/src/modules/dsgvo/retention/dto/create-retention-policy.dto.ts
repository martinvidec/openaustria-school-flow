import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateRetentionPolicyDto {
  @ApiProperty({ description: 'School ID to create retention policy for' })
  @IsUUID()
  schoolId!: string;

  @ApiProperty({
    description: 'Data category (e.g., noten, anwesenheit, kommunikation, audit_mutation, audit_sensitive_read, personal_data, health_data)',
    example: 'noten',
  })
  @IsString()
  @MinLength(1)
  dataCategory!: string;

  @ApiProperty({ description: 'Retention period in days', example: 21900 })
  @IsInt()
  @Min(1)
  retentionDays!: number;
}
