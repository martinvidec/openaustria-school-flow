import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { SchoolModule } from '../school/school.module';

/**
 * Phase 16 Plan 01 — Admin Setup-Completeness aggregation endpoint.
 *
 * Approach B (RESEARCH §C.1): direct PrismaService consumer + SchoolService
 * for address normalization. Deliberately does NOT import TimetableModule or
 * DsgvoModule (RESEARCH Pitfall #2) to avoid duplicate cron schedules.
 */
@Module({
  imports: [SchoolModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
