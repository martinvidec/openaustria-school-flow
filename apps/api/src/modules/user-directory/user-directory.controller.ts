import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserDirectoryService } from './user-directory.service';
import { UserDirectoryQueryDto } from './dto/user-directory-query.dto';
import { LinkPersonDto } from './dto/link-person.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { EffectivePermissionsService } from '../effective-permissions/effective-permissions.service';

/**
 * Phase 13-01 USER-01 + USER-05 — admin user directory.
 *
 * All endpoints under `/admin/users` require `manage user` ability — the
 * Schulleitung / Admin role pair gets it via the seed (D-01); regular
 * teachers / parents / students get a 403.
 */
@ApiTags('admin / user-directory')
@ApiBearerAuth()
@Controller('admin/users')
export class UserDirectoryController {
  constructor(
    private readonly service: UserDirectoryService,
    private readonly effectivePermissionsService: EffectivePermissionsService,
  ) {}

  @Get()
  @CheckPermissions({ action: 'manage', subject: 'user' })
  @ApiOperation({
    summary:
      'Hybrid Keycloak + DB user list with role + person-link hydration',
  })
  @ApiResponse({ status: 200, description: 'Paginated user directory' })
  async findAll(@Query() query: UserDirectoryQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':userId')
  @CheckPermissions({ action: 'manage', subject: 'user' })
  @ApiOperation({ summary: 'Single user detail (KC + roles + personLink)' })
  @ApiResponse({ status: 404, description: 'Keycloak user not found' })
  async findOne(@Param('userId') userId: string) {
    return this.service.findOne(userId);
  }

  @Put(':userId/enabled')
  @CheckPermissions({ action: 'manage', subject: 'user' })
  @ApiOperation({ summary: 'Toggle KC enabled flag (idempotent)' })
  async setEnabled(
    @Param('userId') userId: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.service.setEnabled(userId, body.enabled);
  }

  @Post(':userId/link-person')
  @CheckPermissions({ action: 'manage', subject: 'user' })
  @ApiOperation({
    summary:
      'Link a Keycloak user to a Teacher / Student / Parent person row',
  })
  @ApiResponse({
    status: 409,
    description:
      'Person- or user-side link conflict — RFC 9457 problem+json with extensions.affectedEntities',
  })
  async linkPerson(
    @Param('userId') userId: string,
    @Body() dto: LinkPersonDto,
  ) {
    return this.service.linkPerson(userId, dto);
  }

  @Delete(':userId/link-person')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'manage', subject: 'user' })
  @ApiOperation({ summary: 'Remove the Person link (idempotent no-op if absent)' })
  async unlinkPerson(@Param('userId') userId: string) {
    await this.service.unlinkPerson(userId);
  }

  @Get(':userId/effective-permissions')
  @CheckPermissions({ action: 'manage', subject: 'user' })
  @ApiOperation({
    summary:
      'Flat list of a user\'s effective permissions with source attribution',
  })
  async effectivePermissions(@Param('userId') userId: string) {
    return this.effectivePermissionsService.resolve(userId);
  }
}
