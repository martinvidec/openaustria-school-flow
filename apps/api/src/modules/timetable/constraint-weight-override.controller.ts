import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConstraintWeightOverrideService } from './constraint-weight-override.service';
import { BulkConstraintWeightsDto } from './dto/constraint-weight.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';

/**
 * Phase 14 D-05/D-07 — Admin endpoints for school-scoped soft-constraint
 * weight overrides.
 *
 * The @CheckPermissions decorator subject literal is exactly
 * `'constraint-weight-override'` — grep-verified by the audit E2E spec
 * (Plan 14-03 / E2E-SOLVER-11). Do NOT abbreviate or rename.
 */
@ApiTags('constraint-weight-overrides')
@ApiBearerAuth()
@Controller('schools/:schoolId/constraint-weights')
export class ConstraintWeightOverrideController {
  constructor(private readonly service: ConstraintWeightOverrideService) {}

  @Get()
  @CheckPermissions({ action: 'read', subject: 'constraint-weight-override' })
  @ApiOperation({
    summary:
      'Get the merged weight map (DB overrides + defaults) plus lastUpdatedAt for a school',
  })
  @ApiResponse({ status: 200, description: 'Merged weight map + last updated timestamp' })
  async findBySchool(@Param('schoolId') schoolId: string) {
    const [weights, lastUpdatedAt] = await Promise.all([
      this.service.findBySchool(schoolId),
      this.service.findLastUpdatedAt(schoolId),
    ]);
    return { weights, lastUpdatedAt: lastUpdatedAt?.toISOString() ?? null };
  }

  @Put()
  @CheckPermissions({ action: 'manage', subject: 'constraint-weight-override' })
  @ApiOperation({ summary: 'Bulk-replace all weight overrides for a school (atomic)' })
  @ApiResponse({ status: 200, description: 'Updated weight map + lastUpdatedAt' })
  @ApiResponse({
    status: 422,
    description: 'Unknown constraint name or weight out of range (RFC 9457)',
  })
  async bulkReplace(
    @Param('schoolId') schoolId: string,
    @Body() dto: BulkConstraintWeightsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const weights = await this.service.bulkReplace(schoolId, dto.weights, user?.id);
    const lastUpdatedAt = await this.service.findLastUpdatedAt(schoolId);
    return { weights, lastUpdatedAt: lastUpdatedAt?.toISOString() ?? null };
  }

  @Delete(':constraintName')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'manage', subject: 'constraint-weight-override' })
  @ApiOperation({ summary: 'Reset a single weight override to default (deletes row)' })
  @ApiResponse({ status: 204, description: 'Override reset' })
  async resetOne(
    @Param('schoolId') schoolId: string,
    @Param('constraintName') constraintName: string,
  ) {
    await this.service.resetOne(schoolId, decodeURIComponent(constraintName));
  }
}
