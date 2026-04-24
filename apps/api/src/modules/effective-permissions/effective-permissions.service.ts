import { Injectable } from '@nestjs/common';
import { interpolateConditions } from '@schoolflow/shared';
import { PrismaService } from '../../config/database/prisma.service';

/**
 * Phase 13-01 USER-04 — read-only resolver mirroring CaslAbilityFactory.
 *
 * The CASL factory builds the runtime AppAbility (used by PermissionsGuard
 * to allow / deny requests). This service produces a flat human-readable
 * representation of the SAME data, with each row carrying its source
 * attribution (role name vs. override) so the admin UI's
 * EffectivePermissionsTable can render "Geerbt von Rolle: Lehrer" vs.
 * "Override (Begründung: Vertretung)" chips.
 *
 * The {{ id }} interpolation comes from `@schoolflow/shared` — same util
 * the CASL factory uses (Plan 13-01 Task 1). Single source of truth, no
 * drift between "what the user can do" and "what the admin sees".
 */

export type EffectivePermissionRow = {
  action: string;
  subject: string;
  granted: boolean;
  conditions: Record<string, unknown> | null;
  interpolatedConditions: Record<string, unknown> | null;
  source: { kind: 'role'; roleName: string } | { kind: 'override' };
  reason: string | null;
};

@Injectable()
export class EffectivePermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(userId: string): Promise<EffectivePermissionRow[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    const roleNames = userRoles.map((ur: any) => ur.role.name);

    const [rolePerms, overrides] = await Promise.all([
      this.prisma.permission.findMany({
        where: { role: { name: { in: roleNames } } },
        include: { role: true },
      }),
      this.prisma.permissionOverride.findMany({ where: { userId } }),
    ]);

    const rows: EffectivePermissionRow[] = [
      ...rolePerms.map((p: any) => ({
        action: p.action,
        subject: p.subject,
        granted: !p.inverted,
        conditions: (p.conditions as Record<string, unknown> | null) ?? null,
        interpolatedConditions: p.conditions
          ? interpolateConditions(p.conditions as Record<string, unknown>, {
              id: userId,
            })
          : null,
        source: { kind: 'role' as const, roleName: p.role.name },
        reason: null,
      })),
      ...overrides.map((o: any) => ({
        action: o.action,
        subject: o.subject,
        granted: o.granted,
        conditions: (o.conditions as Record<string, unknown> | null) ?? null,
        interpolatedConditions: o.conditions
          ? interpolateConditions(o.conditions as Record<string, unknown>, {
              id: userId,
            })
          : null,
        source: { kind: 'override' as const },
        reason: o.reason ?? null,
      })),
    ];

    return rows;
  }
}
