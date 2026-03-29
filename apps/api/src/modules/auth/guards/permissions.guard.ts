import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { CHECK_PERMISSIONS_KEY, RequiredPermission } from '../decorators/check-permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../types/authenticated-user';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip public endpoints
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    if (!user) return false;

    // Check role-level requirement (simple role check)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles && !requiredRoles.some((role) => user.roles.includes(role))) {
      throw new ForbiddenException('Zugriff verweigert. Sie haben keine Berechtigung fuer diese Aktion.');
    }

    // Check CASL permission requirement
    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
      CHECK_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No specific permissions required beyond auth
    }

    const ability = await this.caslAbilityFactory.createForUser(user);

    for (const permission of requiredPermissions) {
      if (!ability.can(permission.action, permission.subject)) {
        throw new ForbiddenException('Zugriff verweigert. Sie haben keine Berechtigung fuer diese Aktion.');
      }
    }

    return true;
  }
}
