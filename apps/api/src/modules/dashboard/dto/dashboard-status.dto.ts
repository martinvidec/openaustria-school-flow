import { ApiProperty } from '@nestjs/swagger';

/**
 * Per-category status — D-03 ternary: 'done' | 'partial' | 'missing'.
 * Locked by .planning/phases/16-admin-dashboard-mobile-h-rtung/16-CONTEXT.md.
 */
export type CategoryStatus = 'done' | 'partial' | 'missing';

/**
 * 10 Setup-Completeness categories. Order MATCHES CONTEXT D-06 and is
 * preserved by `DashboardService.getStatus`.
 */
export type CategoryKey =
  | 'school'
  | 'timegrid'
  | 'schoolyear'
  | 'subjects'
  | 'teachers'
  | 'classes'
  | 'students'
  | 'solver'
  | 'dsgvo'
  | 'audit';

export class CategoryStatusDto {
  @ApiProperty({
    enum: [
      'school',
      'timegrid',
      'schoolyear',
      'subjects',
      'teachers',
      'classes',
      'students',
      'solver',
      'dsgvo',
      'audit',
    ],
  })
  key!: CategoryKey;

  @ApiProperty({ enum: ['done', 'partial', 'missing'] })
  status!: CategoryStatus;

  @ApiProperty({ description: 'German secondary copy filled with {n}/{label}' })
  secondary!: string;
}

export class DashboardStatusDto {
  @ApiProperty()
  schoolId!: string;

  @ApiProperty({ description: 'ISO-8601 timestamp' })
  generatedAt!: string;

  @ApiProperty({
    type: [CategoryStatusDto],
    description: 'Length 10, ORDER MATCHES CONTEXT D-06',
  })
  categories!: CategoryStatusDto[];
}
