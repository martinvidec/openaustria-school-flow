import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CheckPermissions } from '../../../modules/auth/decorators/check-permissions.decorator';
import { StatsWindowQueryDto } from '../dto/substitution-stats.dto';
import {
  SubstitutionStatsService,
  type FairnessStatRow,
} from './substitution-stats.service';

/**
 * SUBST-06 -- Fairness statistics REST API.
 *
 * Mounted under /schools/:schoolId/substitution-stats to match the school-scoped
 * pattern used throughout Phases 2-5 (AuthenticatedUser does not carry schoolId).
 * Global prefix `api/v1` is applied once in main.ts so the @Controller() path
 * stays NON-prefixed.
 */
@ApiTags('Substitution')
@ApiBearerAuth()
@Controller('schools/:schoolId/substitution-stats')
export class SubstitutionStatsController {
  constructor(private readonly service: SubstitutionStatsService) {}

  @Get()
  @CheckPermissions({ action: 'read', subject: 'substitution' })
  @ApiOperation({
    summary:
      'Get fairness statistics per teacher with configurable window (week/month/semester/schoolYear/custom)',
  })
  async getFairness(
    @Param('schoolId') schoolId: string,
    @Query() query: StatsWindowQueryDto,
  ): Promise<FairnessStatRow[]> {
    return this.service.getFairnessStats(schoolId, {
      window: query.window,
      customStart: query.customStart ? new Date(query.customStart) : undefined,
      customEnd: query.customEnd ? new Date(query.customEnd) : undefined,
    });
  }
}
