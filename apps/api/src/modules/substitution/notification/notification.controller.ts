import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { ListNotificationsQueryDto } from '../dto/notification.dto';
import { NotificationService } from './notification.service';

/**
 * SUBST-03 -- Notification center REST API.
 *
 * Scoped to the authenticated user ("me" resource) so no :userId param is
 * required in the URL. Global prefix `api/v1` is applied via main.ts setGlobalPrefix,
 * so this controller path must NOT start with `api/`.
 */
@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('me/notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'List current user notifications (paginated)' })
  async list(
    @Query() query: ListNotificationsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notifications.listForUser(user.id, {
      unreadOnly: query.unreadOnly,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  async markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.notifications.markRead(id, user.id);
    return { ok: true };
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    await this.notifications.markAllRead(user.id);
    return { ok: true };
  }
}
