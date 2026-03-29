import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService, SENSITIVE_RESOURCES } from './audit.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user';

/**
 * Decorator metadata key for marking resources as sensitive for audit logging.
 * Use with @SetMetadata('audit_resource', 'grades') on controller methods.
 */
export const AUDIT_RESOURCE_KEY = 'audit_resource';

/**
 * Global interceptor for automatic audit logging (D-05).
 *
 * Logging strategy:
 * - Mutations (POST/PUT/PATCH/DELETE): ALWAYS logged with category MUTATION
 * - Reads (GET): Logged ONLY for sensitive resources (grades, student, teacher, user)
 *   with category SENSITIVE_READ
 * - Non-sensitive reads (timetable, school, health): NOT logged
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    const method = request.method;
    const url = request.url;

    return next.handle().pipe(
      tap(async () => {
        if (!user) return;

        // Determine resource from URL path
        const resource = this.extractResource(url);

        // Log mutations always (D-05)
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          const actionMap: Record<string, string> = {
            POST: 'create',
            PUT: 'update',
            PATCH: 'update',
            DELETE: 'delete',
          };
          await this.auditService.log({
            userId: user.id,
            action: actionMap[method] || method.toLowerCase(),
            resource,
            resourceId: request.params?.id,
            category: 'MUTATION',
            metadata:
              method !== 'DELETE'
                ? { body: this.sanitizeBody(request.body) }
                : undefined,
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
            resourceId: request.params?.id,
            category: 'SENSITIVE_READ',
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
          });
        }
      }),
    );
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
   * Remove sensitive fields from request body before storing in audit metadata.
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
