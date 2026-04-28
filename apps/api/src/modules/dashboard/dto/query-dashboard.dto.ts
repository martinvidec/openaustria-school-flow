import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class QueryDashboardDto {
  @ApiProperty({
    description:
      'Tenant scope — must match admin school context (resolved server-side via DashboardService.resolveAdminSchoolId)',
  })
  @IsUUID()
  schoolId!: string;
}
