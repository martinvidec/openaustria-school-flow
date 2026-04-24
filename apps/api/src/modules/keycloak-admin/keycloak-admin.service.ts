import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/naming-convention
import KeycloakAdminClient from '@keycloak/keycloak-admin-client';
import type UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import { PrismaService } from '../../config/database/prisma.service';
import type { KeycloakUserResponseDto } from './dto/keycloak-user-response.dto';

/**
 * Thin wrapper around @keycloak/keycloak-admin-client.
 *
 * - Uses a realm-scoped service-account (client_credentials grant) with
 *   the `view-users` + `manage-users` + `view-realm` roles in
 *   `realm-management`. Env vars:
 *     KEYCLOAK_URL, KEYCLOAK_REALM
 *     KEYCLOAK_ADMIN_CLIENT_ID, KEYCLOAK_ADMIN_CLIENT_SECRET
 * - Caches the access token until ~30s before expiry (default TTL 5min)
 *   to avoid re-auth on every admin search.
 * - Enriches results with `alreadyLinkedToPersonId` by looking up
 *   Person.keycloakUserId — lets the UI show an amber "bereits verknüpft
 *   mit ..." warning instead of silently overwriting the link.
 *
 * Phase 13-01 Task 2 extension: adds the surface required by
 * UserDirectoryService (paginated list / count / detail / enabled toggle)
 * and RoleManagementService (realm-role mapping mirror per LOCK-01).
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

  // ---------------------------------------------------------------------------
  // Phase 13-01 Task 2 — paginated user directory surface (USER-01)
  // ---------------------------------------------------------------------------

  /**
   * Paginated user listing. `first` is the offset, `max` is the page size.
   * Pass-through to KC admin search; KC returns an array of
   * UserRepresentation. UserDirectoryService merges DB-side data on top.
   */
  async findUsers(params: {
    first: number;
    max: number;
    search?: string;
  }): Promise<UserRepresentation[]> {
    await this.ensureAuth();
    return this.client.users.find(params);
  }

  /**
   * Paginated user count for the same (search) filter — required by
   * UserDirectoryService to compute meta.totalPages without scanning all
   * users into memory.
   */
  async countUsers(params: { search?: string }): Promise<number> {
    await this.ensureAuth();
    const total = await (this.client.users as unknown as {
      count: (p: { search?: string }) => Promise<number>;
    }).count(params);
    return total ?? 0;
  }

  /**
   * Single-user detail fetch. Returns undefined on 404 (USER-01 detail
   * pane and UserDirectoryService.linkPerson person-side pre-check).
   */
  async findUserById(userId: string): Promise<UserRepresentation | undefined> {
    await this.ensureAuth();
    try {
      return await this.client.users.findOne({ id: userId });
    } catch (e: any) {
      if (e?.response?.status === 404 || e?.responseData?.status === 404) {
        return undefined;
      }
      throw e;
    }
  }

  /**
   * Toggle KC `enabled` flag — used by PUT /admin/users/:userId/enabled
   * (USER-01). Idempotent: setting an already-enabled user to enabled is
   * a no-op, both in KC and from the admin UI's perspective.
   */
  async setEnabled(userId: string, enabled: boolean): Promise<void> {
    await this.ensureAuth();
    await this.client.users.update({ id: userId }, { enabled });
  }

  /**
   * List the realm-roles mapped to a user. Used by RoleManagementService
   * to compute the diff (toAdd / toRemove) when mirror-writing role
   * changes per LOCK-01.
   */
  async listRealmRoleMappings(
    userId: string,
  ): Promise<{ id: string; name: string }[]> {
    await this.ensureAuth();
    const roles = await this.client.users.listRealmRoleMappings({ id: userId });
    return (roles ?? []).map((r) => ({ id: r.id!, name: r.name! }));
  }

  /**
   * Add realm-role mappings to a user (LOCK-01 mirror-write). Empty
   * arrays short-circuit so the caller can build a no-op-safe diff.
   */
  async addRealmRoleMappings(
    userId: string,
    roles: { id: string; name: string }[],
  ): Promise<void> {
    if (roles.length === 0) return;
    await this.ensureAuth();
    await this.client.users.addRealmRoleMappings({ id: userId, roles });
  }

  /**
   * Remove realm-role mappings from a user (LOCK-01 mirror-write).
   * Empty arrays short-circuit (same rationale as add).
   */
  async delRealmRoleMappings(
    userId: string,
    roles: { id: string; name: string }[],
  ): Promise<void> {
    if (roles.length === 0) return;
    await this.ensureAuth();
    await this.client.users.delRealmRoleMappings({ id: userId, roles });
  }

  /**
   * Resolve a realm role's `{ id, name }` pair from its name. Required
   * because addRealmRoleMappings / delRealmRoleMappings need the role's
   * KC id, not just the name string.
   */
  async findRealmRoleByName(
    name: string,
  ): Promise<{ id: string; name: string } | undefined> {
    await this.ensureAuth();
    const role = await this.client.roles.findOneByName({ name });
    return role ? { id: role.id!, name: role.name! } : undefined;
  }
}
