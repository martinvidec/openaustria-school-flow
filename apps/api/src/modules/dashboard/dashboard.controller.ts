import { Controller } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

/**
 * STUB — full implementation lands in Task 3.
 * Decorated only so `DashboardModule` boots without DI errors during Task 1.
 */
@ApiTags('admin-dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
export class DashboardController {}
