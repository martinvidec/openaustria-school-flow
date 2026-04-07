import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CalendarService } from './calendar.service';

/**
 * CalendarController -- IMPORT-03 iCal subscription endpoints.
 *
 * Two route sets:
 * 1. Public token-authenticated ICS endpoint (D-09: no JWT, token in URL)
 * 2. JWT-protected token management (create/read/revoke)
 */
@ApiTags('calendar')
@Controller()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // ---------------------------------------------------------------------------
  // Public ICS endpoint (token-authenticated, no JWT)
  // ---------------------------------------------------------------------------

  @Public()
  @Get('api/v1/calendar/:token.ics')
  @ApiOperation({ summary: 'Get iCal feed by subscription token' })
  @ApiParam({ name: 'token', description: 'Calendar subscription token' })
  async getIcs(
    @Param('token') token: string,
    @Res() reply: any,
  ): Promise<void> {
    const tokenRecord = await this.calendarService.findByToken(token);
    if (!tokenRecord) {
      throw new NotFoundException('Kalender-Token nicht gefunden oder widerrufen.');
    }

    const ics = await this.calendarService.generateIcs(
      tokenRecord.userId,
      tokenRecord.schoolId,
    );

    reply
      .header('Content-Type', 'text/calendar; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="schoolflow.ics"')
      .send(ics);
  }

  // ---------------------------------------------------------------------------
  // JWT-protected token management
  // ---------------------------------------------------------------------------

  @Post('api/v1/schools/:schoolId/calendar/token')
  @ApiBearerAuth()
  @CheckPermissions({ action: 'create', subject: 'calendar-token' })
  @ApiOperation({ summary: 'Create a calendar subscription token' })
  async createToken(
    @Param('schoolId') schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.calendarService.generateToken(user.id, schoolId);
  }

  @Get('api/v1/schools/:schoolId/calendar/token')
  @ApiBearerAuth()
  @CheckPermissions({ action: 'read', subject: 'calendar-token' })
  @ApiOperation({ summary: 'Get current calendar subscription token' })
  async getToken(
    @Param('schoolId') schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const existing = await this.calendarService.findTokenForUser(user.id, schoolId);
    if (!existing) return null;

    return {
      id: existing.id,
      token: existing.token,
      calendarUrl: `/api/v1/calendar/${existing.token}.ics`,
      createdAt:
        existing.createdAt instanceof Date
          ? existing.createdAt.toISOString()
          : String(existing.createdAt),
    };
  }

  @Delete('api/v1/schools/:schoolId/calendar/token')
  @ApiBearerAuth()
  @CheckPermissions({ action: 'delete', subject: 'calendar-token' })
  @ApiOperation({ summary: 'Revoke current token and generate a new one' })
  async revokeAndRegenerate(
    @Param('schoolId') schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.calendarService.revokeAndRegenerate(user.id, schoolId);
  }
}
