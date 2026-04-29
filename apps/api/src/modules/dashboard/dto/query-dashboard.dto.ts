import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class QueryDashboardDto {
  @ApiProperty({
    description:
      'Tenant scope — must match admin school context (resolved server-side via DashboardService.resolveAdminSchoolId)',
  })
  // Phase 16 Plan 16-07 Rule-1 fix (parity with create-teacher.dto.ts:23-30
  // and the wider Phase 11 audit): the seed fixture uses literal string IDs
  // (e.g. `seed-school-bgbrg-musterstadt`) which are valid Prisma keys but
  // not RFC 4122 UUIDs. The original Plan 16-01 `@IsUUID()` decorator
  // rejected them with 422 "schoolId must be a UUID" and broke the
  // dashboard against every seed-hosted dev environment. The cross-tenant
  // 403 in DashboardController.getStatus already guards against tampering
  // — the DTO only needs a non-empty string guard.
  @IsString()
  @MinLength(1)
  schoolId!: string;
}
