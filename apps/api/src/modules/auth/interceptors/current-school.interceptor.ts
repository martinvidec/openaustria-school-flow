import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { PrismaService } from '../../../config/database/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../types/authenticated-user';

/**
 * Resolves the current school context for every authenticated request.
 *
 * See `docs/adr/0001-current-school-context.md` for the full design.
 *
 * Behavior:
 *   - `@Public()` routes are skipped.
 *   - Requests without `req.user` (auth-rejected upstream) are skipped.
 *   - Loads `Person.findMany({ where: { keycloakUserId } })` to determine
 *     valid memberships. Single indexed lookup post-#133 composite-unique.
 *   - With `X-School-Id` header: must match a membership, else 403.
 *   - Without header: defaults to the first membership's `schoolId`, or
 *     `null` if the user has no Person row (e.g., admin-only KC accounts).
 */
@Injectable()
export class CurrentSchoolInterceptor implements NestInterceptor {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return next.handle();

    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthenticatedUser | undefined;
    if (!user) return next.handle();

    const memberships = await this.prisma.person.findMany({
      where: { keycloakUserId: user.id },
      select: { schoolId: true },
    });
    const memberSchoolIds = memberships.map((m) => m.schoolId);

    const rawHeader = req.headers['x-school-id'];
    const headerSchoolId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (headerSchoolId) {
      if (!memberSchoolIds.includes(headerSchoolId)) {
        throw new ForbiddenException(
          `Zugriff verweigert. Sie sind kein Mitglied der angeforderten Schule.`,
        );
      }
      req.currentSchoolId = headerSchoolId;
    } else {
      req.currentSchoolId = memberSchoolIds[0] ?? null;
    }

    return next.handle();
  }
}
