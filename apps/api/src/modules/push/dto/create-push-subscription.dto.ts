import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Encrypted keys returned by the browser `PushSubscription` object.
 * See https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription/getKey
 */
export class PushSubscriptionKeysDto {
  @ApiProperty({
    description: 'Elliptic curve Diffie-Hellman public key (base64url)',
  })
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @ApiProperty({ description: 'Authentication secret (base64url)' })
  @IsString()
  @IsNotEmpty()
  auth!: string;
}

/**
 * Body of POST /push-subscriptions. Mirrors the JSON shape returned by
 * `PushSubscription.toJSON()` on the browser side.
 */
export class CreatePushSubscriptionDto {
  @ApiProperty({
    description: 'Opaque push service endpoint URL',
    example: 'https://fcm.googleapis.com/fcm/send/abc123',
  })
  @IsUrl({ require_protocol: true, require_tld: false })
  @IsNotEmpty()
  endpoint!: string;

  @ApiProperty({ type: PushSubscriptionKeysDto })
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;
}

/**
 * Body of DELETE /push-subscriptions. Just the endpoint — the opaque URL
 * already identifies the subscription uniquely (it is the `@unique` column).
 */
export class DeletePushSubscriptionDto {
  @ApiProperty({
    description: 'Opaque push service endpoint URL to remove',
  })
  @IsUrl({ require_protocol: true, require_tld: false })
  @IsNotEmpty()
  endpoint!: string;
}
