import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { KeycloakAdminService } from '../keycloak-admin/keycloak-admin.service';

/**
 * Phase 13-01 USER-02 — RoleManagementService.
 *
 * LOCK-01 (mirror-write): every UserRole mutation in Postgres is mirrored
 * into Keycloak realm-role mappings. Keycloak remains authoritative for
 * JWT-role claims; the prisma.userRole table is a denormalised cache used
 * by UserDirectoryService for DB-side filter queries (post-Phase-1
 * CaslAbilityFactory still derives ability from JWT roles, NOT from
 * prisma.userRole — that path is unchanged).
 *
 * Concurrency: the role-mutation block runs inside a Serializable
 * transaction so a "demote both admins simultaneously" race resolves
 * with exactly-one-wins semantics (T-13-08, validated in unit test).
 *
 * Last-admin guard (T-13-09 / D-07): after every UserRole write, the
 * total count of users with the `admin` role must remain ≥ 1. Any
 * attempt that drops the count to 0 trips RFC 9457 409
 * `schoolflow://errors/last-admin-guard` and the transaction rolls back.
 *
 * KC mirror-write happens AFTER the DB commit. If the KC call fails the
 * DB still wins; admins re-applying the same role set reconciles. This
 * residual-risk decision is documented in the threat register (T-13-10).
 */
@Injectable()
export class RoleManagementService {
  private readonly logger = new Logger(RoleManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kcAdmin: KeycloakAdminService,
  ) {}

  async listAllRoles() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  async listUserRoles(userId: string) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return { roles: userRoles.map((ur: any) => ur.role.name) };
  }

  /**
   * LOCK-01 mirror-write — replace UserRole rows then sync KC realm-role
   * mappings. See class doc-comment for invariants.
   */
  async updateUserRoles(userId: string, dto: { roleNames: string[] }) {
    const requestedNames = [...new Set(dto.roleNames)];

    // -- DB tx: validate → replace → guard ------------------------------------
    await this.prisma.$transaction(
      async (tx: any) => {
        // 1. Validate every requested role name exists.
        const found = await tx.role.findMany({
          where: { name: { in: requestedNames } },
        });
        if (found.length !== requestedNames.length) {
          const foundNames = new Set(found.map((r: any) => r.name));
          const missing = requestedNames.filter((n) => !foundNames.has(n));
          throw new BadRequestException(
            `Unbekannte Rolle(n): ${missing.join(', ')}`,
          );
        }

        // 2. Replace UserRole rows.
        await tx.userRole.deleteMany({ where: { userId } });
        if (found.length > 0) {
          await tx.userRole.createMany({
            data: found.map((r: any) => ({ userId, roleId: r.id })),
            skipDuplicates: true,
          });
        }

        // 3. Min-1-admin invariant — fail-fast inside the tx so it rolls back.
        const adminCount = await tx.userRole.count({
          where: { role: { name: 'admin' } },
        });
        if (adminCount < 1) {
          throw new ConflictException({
            type: 'schoolflow://errors/last-admin-guard',
            title: 'Mindestens ein Admin muss bestehen bleiben',
            detail:
              'Diese Änderung würde die Schule ohne Administrator zurücklassen. Weisen Sie zuerst einer anderen Person die Admin-Rolle zu.',
          });
        }
      },
      { isolationLevel: 'Serializable' },
    );

    // -- KC mirror-write (after DB commit) ------------------------------------
    try {
      const currentKcRoles = await this.kcAdmin.listRealmRoleMappings(userId);
      const desiredSet = new Set(requestedNames);
      const currentSet = new Set(currentKcRoles.map((r) => r.name));

      const toAddNames = requestedNames.filter((n) => !currentSet.has(n));
      const toRemove = currentKcRoles.filter((r) => !desiredSet.has(r.name));

      const toAdd: { id: string; name: string }[] = [];
      for (const name of toAddNames) {
        const role = await this.kcAdmin.findRealmRoleByName(name);
        if (role) toAdd.push(role);
      }

      // Skip adapter call entirely on empty diffs (the adapter
      // short-circuits internally too; this also keeps unit-tests
      // assertion-clean).
      if (toAdd.length > 0) {
        await this.kcAdmin.addRealmRoleMappings(userId, toAdd);
      }
      if (toRemove.length > 0) {
        await this.kcAdmin.delRealmRoleMappings(userId, toRemove);
      }
    } catch (e: any) {
      // T-13-10: log, do not throw. DB is the winner; admin can re-apply
      // to retry the mirror-write.
      this.logger.error(
        `LOCK-01 mirror-write failed for ${userId}: ${e?.message ?? e}. ` +
          `DB roles are committed; Keycloak roles may be stale until re-applied.`,
      );
    }

    return this.listUserRoles(userId);
  }
}
