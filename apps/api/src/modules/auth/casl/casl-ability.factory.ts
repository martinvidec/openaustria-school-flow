import { Injectable } from '@nestjs/common';
import { AbilityBuilder, PureAbility, createMongoAbility } from '@casl/ability';
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
      const conditions = perm.conditions
        ? this.interpolateConditions(perm.conditions as Record<string, unknown>, user)
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
        ? this.interpolateConditions(override.conditions as Record<string, unknown>, user)
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

  private interpolateConditions(
    conditions: Record<string, unknown>,
    user: AuthenticatedUser,
  ): Record<string, unknown> {
    const parsed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(conditions)) {
      if (typeof value === 'string' && value.includes('{{ id }}')) {
        parsed[key] = value.replace('{{ id }}', user.id);
      } else {
        parsed[key] = value;
      }
    }
    return parsed;
  }
}
