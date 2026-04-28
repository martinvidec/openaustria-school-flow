import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConsentService } from './consent.service';
import { CreateConsentDto } from './dto/create-consent.dto';
import { WithdrawConsentDto } from './dto/withdraw-consent.dto';
import { QueryConsentAdminDto } from './dto/query-consent-admin.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { CheckPermissions } from '../../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';

@ApiTags('dsgvo-consent')
@ApiBearerAuth()
@Controller('dsgvo/consent')
export class ConsentController {
  constructor(private consentService: ConsentService) {}

  @Post()
  @CheckPermissions({ action: 'create', subject: 'consent' })
  @ApiOperation({ summary: 'Grant consent for a processing purpose' })
  @ApiResponse({ status: 201, description: 'Consent granted' })
  @ApiResponse({ status: 409, description: 'Consent already granted' })
  async grant(@Body() dto: CreateConsentDto) {
    return this.consentService.grant(dto);
  }

  @Post('withdraw')
  @CheckPermissions({ action: 'update', subject: 'consent' })
  @ApiOperation({ summary: 'Withdraw consent for a processing purpose' })
  @ApiResponse({ status: 200, description: 'Consent withdrawn' })
  @ApiResponse({ status: 404, description: 'Consent record not found' })
  async withdraw(@Body() dto: WithdrawConsentDto) {
    return this.consentService.withdraw(dto);
  }

  @Get('person/:personId')
  @CheckPermissions({ action: 'read', subject: 'consent' })
  @ApiOperation({ summary: 'Get all consent records for a person' })
  @ApiResponse({ status: 200, description: 'Consent records returned' })
  async findByPerson(@Param('personId') personId: string) {
    return this.consentService.findByPerson(personId);
  }

  @Get('admin')
  @CheckPermissions({ action: 'read', subject: 'consent' })
  @ApiOperation({
    summary: 'Admin filter list of consent records (DSGVO-ADM-01)',
    description:
      'Returns paginated consent records for the supplied schoolId, filtered by purpose / status / personSearch. Admin role required (service-level 403 for non-admin).',
  })
  @ApiResponse({ status: 200, description: 'Paginated consent records with person identity included' })
  @ApiResponse({ status: 403, description: 'Caller is not admin' })
  @ApiResponse({ status: 422, description: 'schoolId missing or invalid' })
  async findAllForAdmin(
    @Query() query: QueryConsentAdminDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consentService.findAllForAdmin(
      {
        schoolId: query.schoolId,
        purpose: query.purpose,
        status: query.status,
        personSearch: query.personSearch,
        page: query.page,
        limit: query.limit,
        skip: query.skip,
      },
      user,
    );
  }

  @Get('school/:schoolId')
  @CheckPermissions({ action: 'read', subject: 'consent' })
  @ApiOperation({ summary: 'Get all consent records for a school (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated consent records' })
  async findBySchool(
    @Param('schoolId') schoolId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.consentService.findBySchool(schoolId, pagination);
  }
}
