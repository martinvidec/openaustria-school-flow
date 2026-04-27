import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, from, switchMap, tap } from 'rxjs';
import { AuditService, SENSITIVE_RESOURCES } from './audit.service';
import { PrismaService } from '../../config/database/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user';

/**
 * Decorator metadata key for marking resources as sensitive for audit logging.
 * Use with @SetMetadata('audit_resource', 'grades') on controller methods.
 */
export const AUDIT_RESOURCE_KEY = 'audit_resource';

/**
 * Map URL path segment → Prisma model accessor (delegate name) for pre-state
 * capture (Phase 15 D-10). Resources NOT in this map fall back to before=null.
 *
 * Adding entries here is opt-in: only DSGVO-relevant + commonly-mutated
 * resources are mapped to keep the snapshot read cost bounded (RESEARCH §3).
 */
const RESOURCE_MODEL_MAP: Record<string, string> = {
  consent: 'consentRecord',
  retention: 'retentionPolicy',
  dsfa: 'dsfaEntry',
  vvz: 'vvzEntry',
  schools: 'school',
  students: 'student',
  teachers: 'teacher',
  classes: 'schoolClass',
  subjects: 'subject',
  rooms: 'room',
  resources: 'resource',
};

/**
 * Global interceptor for automatic audit logging (D-05).
 *
 * Logging strategy:
 * - Mutations (POST/PUT/PATCH/DELETE): ALWAYS logged with category MUTATION
 * - Reads (GET): Logged ONLY for sensitive resources (grades, student, teacher, user)
 *   with category SENSITIVE_READ
 * - Non-sensitive reads (timetable, school, health): NOT logged
 *
 * Pre-state capture (Phase 15 D-10):
 * - For PUT/PATCH/DELETE on a mapped resource (RESOURCE_MODEL_MAP) with
 *   request.params.id, the interceptor reads the row from DB BEFORE the
 *   handler runs. The snapshot is sanitized via sanitizeBody and persisted
 *   to AuditEntry.before. POST/GET requests get before=undefined.
 * - DB lookup failures resolve to before=undefined (fail-soft); the
 *   interceptor MUST NEVER block the handler (RESEARCH §3, T-15-01-03).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private auditService: AuditService,
    private prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    const method = request.method;
    const url = request.url;
    const resource = this.extractResource(url);
    const id: string | undefined = request.params?.id;

    const isMutationOnExistingRow =
      ['PUT', 'PATCH', 'DELETE'].includes(method) && !!id;

    const beforeP: Promise<unknown> = isMutationOnExistingRow
      ? this.captureBeforeState(resource, id!)
      : Promise.resolve(undefined);

    return from(beforeP).pipe(
      switchMap((snapshot) =>
        next.handle().pipe(
          tap(async () => {
            if (!user) return;

            // Log mutations always (D-05)
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
              const actionMap: Record<string, string> = {
                POST: 'create',
                PUT: 'update',
                PATCH: 'update',
                DELETE: 'delete',
              };
              const sanitizedBefore =
                snapshot !== undefined && snapshot !== null
                  ? this.sanitizeBody(snapshot)
                  : undefined;
              await this.auditService.log({
                userId: user.id,
                action: actionMap[method] || method.toLowerCase(),
                resource,
                resourceId: id,
                category: 'MUTATION',
                metadata:
                  method !== 'DELETE'
                    ? { body: this.sanitizeBody(request.body) }
                    : undefined,
                before: sanitizedBefore,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent'],
              });
            }

            // Log sensitive reads only (D-05)
            if (
              method === 'GET' &&
              SENSITIVE_RESOURCES.includes(resource as any)
            ) {
              await this.auditService.log({
                userId: user.id,
                action: 'read',
                resource,
                resourceId: id,
                category: 'SENSITIVE_READ',
                ipAddress: request.ip,
                userAgent: request.headers['user-agent'],
              });
            }
          }),
        ),
      ),
    );
  }

  /**
   * Read the pre-mutation row from the DB for mapped resources. Returns
   * `undefined` for unmapped resources or on any DB error (fail-soft —
   * audit MUST NOT block the handler, T-15-01-03).
   *
   * NOTE: Tenant scoping is intentionally NOT applied here. Pre-state
   * capture happens before the handler enforces tenant guards; the audit
   * read endpoint (`AuditService.findAll`) applies role-scoped visibility
   * downstream (RESEARCH §8, D-24).
   */
  private async captureBeforeState(
    resource: string,
    id: string,
  ): Promise<unknown> {
    const modelName = RESOURCE_MODEL_MAP[resource];
    if (!modelName) return undefined;
    try {
      const delegate = (this.prisma as any)[modelName];
      if (!delegate || typeof delegate.findUnique !== 'function') {
        return undefined;
      }
      const row = await delegate.findUnique({ where: { id } });
      return row ?? undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Extract resource name from URL path.
   * Expects format: /api/v1/{resource}/... or /{resource}/...
   */
  private extractResource(url: string): string {
    // Try /api/v1/{resource} first
    const apiMatch = url.match(/\/api\/v1\/([^/?]+)/);
    if (apiMatch) return apiMatch[1];

    // Fallback: first path segment after leading slash
    const segments = url.split('?')[0].split('/').filter(Boolean);
    return segments[0] || 'unknown';
  }

  /**
   * Remove sensitive fields from request body or pre-state snapshot before
   * storing in audit metadata/before.
   *
   * Note (D-24): `email` and `phone` are NOT redacted — audit log is admin-only
   * and forensic accuracy takes precedence over PII minimization.
   */
  private sanitizeBody(body: any): any {
    if (!body) return undefined;
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'secret', 'token', 'credential'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
