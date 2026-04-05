import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckPermissions } from '../../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import {
  AssignSubstituteDto,
  RespondToOfferDto,
  SetStillarbeitDto,
} from '../dto/substitution.dto';
import { SubstitutionService } from './substitution.service';

/**
 * Substitution lifecycle REST API — SUBST-03 / SUBST-05.
 *
 * School-scoped URL pattern matching the project convention
 * (/schools/:schoolId/absences, /schools/:schoolId/classbook/...). The global
 * `api/v1` prefix is set once in main.ts, so individual controllers use plain
 * path segments (CLAUDE.md historical double-prefix note).
 */
@ApiTags('Substitution')
@ApiBearerAuth()
@Controller('schools/:schoolId/substitutions')
export class SubstitutionController {
  constructor(private readonly service: SubstitutionService) {}

  @Get()
  @CheckPermissions({ action: 'read', subject: 'substitution' })
  @ApiOperation({ summary: 'List pending/offered/declined substitutions for a school' })
  async list(@Param('schoolId') schoolId: string) {
    return this.service.findManyPending(schoolId);
  }

  @Get(':id')
  @CheckPermissions({ action: 'read', subject: 'substitution' })
  @ApiOperation({ summary: 'Get a single substitution by id' })
  async getOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'manage', subject: 'substitution' })
  @ApiOperation({ summary: 'Assign a candidate teacher as substitute (PENDING → OFFERED, Pitfall 2 Serializable guard)' })
  @ApiResponse({ status: 200, description: 'Substitution assigned and OFFERED to candidate' })
  @ApiResponse({ status: 409, description: 'Candidate no longer available or substitution not in a reassignable state' })
  async assign(
    @Param('id') id: string,
    @Body() dto: AssignSubstituteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.assignSubstitute({
      substitutionId: id,
      candidateTeacherId: dto.candidateTeacherId,
      assignedBy: user.id,
    });
  }

  @Patch(':id/respond')
  @CheckPermissions({ action: 'update', subject: 'substitution' })
  @ApiOperation({ summary: 'Substitute responds to offer (accept → CONFIRMED + ClassBookEntry, decline → DECLINED)' })
  @ApiResponse({ status: 200, description: 'Response recorded' })
  @ApiResponse({ status: 403, description: 'Responding user is not the assigned substitute' })
  @ApiResponse({ status: 409, description: 'Substitution not in OFFERED state' })
  async respond(
    @Param('id') id: string,
    @Body() dto: RespondToOfferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.respondToOffer({
      substitutionId: id,
      userId: user.id,
      accept: dto.accept,
      declineReason: dto.declineReason,
    });
  }

  @Post(':id/entfall')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'manage', subject: 'substitution' })
  @ApiOperation({ summary: 'Mark substitution as Entfall (lesson cancelled, no ClassBookEntry)' })
  async entfall(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.setEntfall({
      substitutionId: id,
      actorUserId: user.id,
    });
  }

  @Post(':id/stillarbeit')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'manage', subject: 'substitution' })
  @ApiOperation({ summary: 'Mark substitution as Stillarbeit (thema="Stillarbeit" ClassBookEntry, optional supervisor)' })
  async stillarbeit(
    @Param('id') id: string,
    @Body() dto: SetStillarbeitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.setStillarbeit({
      substitutionId: id,
      supervisorTeacherId: dto.supervisorTeacherId,
      actorUserId: user.id,
    });
  }
}
