import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DsgvoJobsService } from './dsgvo-jobs.service';
import { QueryDsgvoJobsDto } from './dto/query-dsgvo-jobs.dto';
import { CheckPermissions } from '../../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';

@ApiTags('dsgvo/jobs')
@ApiBearerAuth()
@Controller('dsgvo/jobs')
export class DsgvoJobsController {
  constructor(private jobsService: DsgvoJobsService) {}

  @Get()
  @CheckPermissions({ action: 'read', subject: 'export' })
  @ApiOperation({ summary: 'School-wide list of DSGVO async jobs (admin only, D-23)' })
  @ApiResponse({ status: 200, description: 'Paginated DsgvoJob list' })
  @ApiResponse({ status: 403, description: 'Non-admin caller (service-level guard)' })
  @ApiResponse({ status: 422, description: 'Missing/invalid schoolId or enum mismatch' })
  async findAllForAdmin(
    @Query() query: QueryDsgvoJobsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jobsService.findAllForAdmin(query, user);
  }
}
