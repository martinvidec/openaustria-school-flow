import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { VapidPublicKeyResponse } from '@schoolflow/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import {
  CreatePushSubscriptionDto,
  DeletePushSubscriptionDto,
} from './dto/create-push-subscription.dto';
import { PushService } from './push.service';

/**
 * MOBILE-02 -- REST API for web push subscription management (D-05, D-07).
 *
 * - POST /push-subscriptions     (JWT) — register a browser push subscription
 * - DELETE /push-subscriptions   (JWT) — remove a subscription by endpoint
 * - GET /push/vapid-key          (public) — return the public VAPID key
 *
 * The /push/vapid-key endpoint is deliberately @Public() because the
 * frontend needs the public key BEFORE the user logs in — the service
 * worker registration flow may run at app shell boot, and the anonymous
 * browser must be able to fetch the key without a JWT. This is safe: the
 * public VAPID key is not a secret (its whole purpose is to be shipped to
 * browsers).
 */
@ApiTags('Push Notifications')
@Controller()
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('push-subscriptions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a browser push subscription for the current user' })
  @ApiResponse({ status: 201, description: 'Subscription stored' })
  @HttpCode(HttpStatus.CREATED)
  async subscribe(
    @Body() body: CreatePushSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ ok: true }> {
    await this.pushService.subscribe(user.id, body);
    return { ok: true };
  }

  @Delete('push-subscriptions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a browser push subscription by endpoint' })
  @ApiResponse({ status: 204, description: 'Subscription removed' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsubscribe(@Body() body: DeletePushSubscriptionDto): Promise<void> {
    await this.pushService.unsubscribe(body.endpoint);
  }

  @Get('push/vapid-key')
  @Public()
  @ApiOperation({
    summary: 'Get the public VAPID key used for push subscription',
    description:
      'Public endpoint — the VAPID public key is not a secret and must be accessible before login so the service worker can register push subscriptions at app shell boot.',
  })
  @ApiResponse({ status: 200, description: 'Public VAPID key' })
  getVapidKey(): VapidPublicKeyResponse {
    return { publicKey: this.pushService.getVapidPublicKey() };
  }
}
