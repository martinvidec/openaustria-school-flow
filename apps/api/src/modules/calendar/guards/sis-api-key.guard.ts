import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../../config/database/prisma.service';

/**
 * IMPORT-04 -- API key guard for SIS read-only endpoints.
 *
 * Reads X-Api-Key header, validates against prisma.sisApiKey (isActive=true),
 * sets request.sisSchoolId for downstream use, and updates lastUsed timestamp.
 */
@Injectable()
export class SisApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
      return false;
    }

    const keyRecord = await this.prisma.sisApiKey.findFirst({
      where: { key: apiKey, isActive: true },
    });

    if (!keyRecord) {
      return false;
    }

    // Set schoolId on request for controller access
    request.sisSchoolId = keyRecord.schoolId;

    // Update lastUsed timestamp (fire-and-forget -- non-blocking)
    await this.prisma.sisApiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsed: new Date() },
    });

    return true;
  }
}
