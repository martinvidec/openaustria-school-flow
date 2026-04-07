import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { SisService } from './sis.service';
import { SisApiKeyGuard } from './guards/sis-api-key.guard';

/**
 * SisController -- IMPORT-04 SIS read-only API endpoints.
 *
 * Two route sets:
 * 1. API key-authenticated SIS data endpoints (@Public + SisApiKeyGuard)
 * 2. JWT-protected API key management endpoints (admin-only)
 */
@ApiTags('sis')
@Controller()
export class SisController {
  constructor(private readonly sisService: SisService) {}

  // ---------------------------------------------------------------------------
  // SIS data endpoints (API key auth)
  // ---------------------------------------------------------------------------

  @Public()
  @UseGuards(SisApiKeyGuard)
  @Get('api/v1/sis/students')
  @ApiOperation({ summary: 'List students (SIS API key required)' })
  @ApiHeader({ name: 'X-Api-Key', description: 'SIS API key' })
  async getStudents(@Req() req: any) {
    return this.sisService.getStudents(req.sisSchoolId);
  }

  @Public()
  @UseGuards(SisApiKeyGuard)
  @Get('api/v1/sis/teachers')
  @ApiOperation({ summary: 'List teachers (SIS API key required)' })
  @ApiHeader({ name: 'X-Api-Key', description: 'SIS API key' })
  async getTeachers(@Req() req: any) {
    return this.sisService.getTeachers(req.sisSchoolId);
  }

  @Public()
  @UseGuards(SisApiKeyGuard)
  @Get('api/v1/sis/classes')
  @ApiOperation({ summary: 'List classes (SIS API key required)' })
  @ApiHeader({ name: 'X-Api-Key', description: 'SIS API key' })
  async getClasses(@Req() req: any) {
    return this.sisService.getClasses(req.sisSchoolId);
  }

  // ---------------------------------------------------------------------------
  // API key management endpoints (JWT auth, admin-only)
  // ---------------------------------------------------------------------------

  @Post('api/v1/schools/:schoolId/sis/api-keys')
  @ApiBearerAuth()
  @CheckPermissions({ action: 'manage', subject: 'sis-api-key' })
  @ApiOperation({ summary: 'Create a new SIS API key' })
  async createApiKey(
    @Param('schoolId') schoolId: string,
    @Body() body: { name: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sisService.createApiKey(schoolId, body.name, user.id);
  }

  @Get('api/v1/schools/:schoolId/sis/api-keys')
  @ApiBearerAuth()
  @CheckPermissions({ action: 'manage', subject: 'sis-api-key' })
  @ApiOperation({ summary: 'List SIS API keys for a school' })
  async listApiKeys(@Param('schoolId') schoolId: string) {
    return this.sisService.listApiKeys(schoolId);
  }

  @Delete('api/v1/schools/:schoolId/sis/api-keys/:id')
  @ApiBearerAuth()
  @CheckPermissions({ action: 'manage', subject: 'sis-api-key' })
  @ApiOperation({ summary: 'Revoke a SIS API key' })
  async revokeApiKey(@Param('id') id: string) {
    await this.sisService.revokeApiKey(id);
    return { success: true };
  }
}
