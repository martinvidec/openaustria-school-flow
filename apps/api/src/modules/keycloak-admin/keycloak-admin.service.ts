import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/naming-convention
import KeycloakAdminClient from '@keycloak/keycloak-admin-client';
import { PrismaService } from '../../config/database/prisma.service';
import type { KeycloakUserResponseDto } from './dto/keycloak-user-response.dto';

/**
 * Thin wrapper around @keycloak/keycloak-admin-client.
 *
 * - Uses a realm-scoped service-account (client_credentials grant) with
 *   the `view-users` role in `realm-management`. Env vars:
 *     KEYCLOAK_URL, KEYCLOAK_REALM
 *     KEYCLOAK_ADMIN_CLIENT_ID, KEYCLOAK_ADMIN_CLIENT_SECRET
 * - Caches the access token until ~30s before expiry (default TTL 5min)
 *   to avoid re-auth on every admin search.
 * - Enriches results with `alreadyLinkedToPersonId` by looking up
 *   Person.keycloakUserId — lets the UI show an amber "bereits verknüpft
 *   mit ..." warning instead of silently overwriting the link.
 */
@Injectable()
export class KeycloakAdminService implements OnModuleInit {
  private readonly logger = new Logger(KeycloakAdminService.name);
  private client!: KeycloakAdminClient;
  private tokenExpiresAt = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.client = new KeycloakAdminClient({
      baseUrl: this.config.getOrThrow<string>('KEYCLOAK_URL'),
      realmName: this.config.getOrThrow<string>('KEYCLOAK_REALM'),
    });
  }

  /**
   * Re-auth if the cached access token is within 30s of expiring.
   * Default Keycloak admin token TTL is 5 minutes.
   */
  private async ensureAuth(): Promise<void> {
    if (Date.now() < this.tokenExpiresAt - 30_000) return;
    try {
      await this.client.auth({
        grantType: 'client_credentials',
        clientId: this.config.getOrThrow<string>('KEYCLOAK_ADMIN_CLIENT_ID'),
        clientSecret: this.config.getOrThrow<string>('KEYCLOAK_ADMIN_CLIENT_SECRET'),
      });
      this.tokenExpiresAt = Date.now() + 5 * 60 * 1000;
    } catch (err) {
      this.logger.error(
        `Failed to authenticate against Keycloak admin API: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  /**
   * Search Keycloak users by email fragment (case-insensitive, max 10).
   * Returns an enriched list with an `alreadyLinkedToPersonId` flag
   * for each match that is already wired up to a SchoolFlow Person.
   */
  async findUsersByEmail(email: string): Promise<KeycloakUserResponseDto[]> {
    await this.ensureAuth();
    const users = await this.client.users.find({ email, exact: false, max: 10 });

    return Promise.all(
      users.map(async (u): Promise<KeycloakUserResponseDto> => {
        const linked = u.id
          ? await this.prisma.person.findUnique({
              where: { keycloakUserId: u.id },
              select: { id: true, firstName: true, lastName: true },
            })
          : null;
        return {
          id: u.id ?? '',
          email: u.email ?? '',
          firstName: u.firstName ?? '',
          lastName: u.lastName ?? '',
          enabled: u.enabled ?? true,
          alreadyLinkedToPersonId: linked?.id,
          alreadyLinkedToPersonName: linked
            ? `${linked.firstName} ${linked.lastName}`
            : undefined,
        };
      }),
    );
  }
}
