import { Injectable } from '@nestjs/common';
import { AbilityBuilder, PureAbility, createMongoAbility } from '@casl/ability';
import { interpolateConditions } from '@schoolflow/shared';
import { PrismaService } from '../../../config/database/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-user';

export type AppAbility = PureAbility<[string, string]>;

@Injectable()
export class CaslAbilityFactory {
  constructor(private prisma: PrismaService) {}

  async createForUser(user: AuthenticatedUser): Promise<AppAbility> {
    const builder = new AbilityBuilder<AppAbility>(createMongoAbility);

    // 1. Load default permissions for ALL user roles (union -- D-04)
    const rolePermissions = await this.prisma.permission.findMany({
      where: { role: { name: { in: user.roles } } },
    });

    // 2. Load user-specific ACL overrides (D-02)
    const userOverrides = await this.prisma.permissionOverride.findMany({
      where: { userId: user.id },
    });

    // 3. Apply role permissions (base layer)
    for (const perm of rolePermissions) {
      // Phase 13-01 Task 1: interpolateConditions moved to @schoolflow/shared
      // so EffectivePermissionsService (Task 3) can reuse the same algorithm —
      // no drift between what the user *can* do and what the admin UI shows.
      const conditions = perm.conditions
        ? interpolateConditions(perm.conditions as Record<string, unknown>, { id: user.id })
        : undefined;

      if (perm.inverted) {
        builder.cannot(perm.action, perm.subject);
      } else {
        if (conditions) {
          builder.can(perm.action, perm.subject, conditions);
        } else {
          builder.can(perm.action, perm.subject);
        }
      }
    }

    // 4. Apply user-level overrides (override layer -- takes precedence)
    for (const override of userOverrides) {
      const conditions = override.conditions
        ? interpolateConditions(override.conditions as Record<string, unknown>, { id: user.id })
        : undefined;

      if (override.granted) {
        if (conditions) {
          builder.can(override.action, override.subject, conditions);
        } else {
          builder.can(override.action, override.subject);
        }
      } else {
        builder.cannot(override.action, override.subject);
      }
    }

    return builder.build();
  }
}
