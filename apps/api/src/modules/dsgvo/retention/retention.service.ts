import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { existsSync, unlinkSync } from 'node:fs';
import { PrismaService } from '../../../config/database/prisma.service';
import { CreateRetentionPolicyDto } from './dto/create-retention-policy.dto';

/** Austrian-specific default retention periods in days */
export const DEFAULT_RETENTION_DAYS: Record<string, number> = {
  noten: 21900,                // 60 years -- Austrian Aufbewahrungspflicht
  anwesenheit: 1825,           // 5 years
  kommunikation: 365,          // 1 year
  audit_mutation: 1095,        // 3 years (from Phase 1 D-07)
  audit_sensitive_read: 365,   // 1 year (from Phase 1 D-07)
  personal_data: 1825,         // 5 years after departure
  health_data: 365,            // 1 year after purpose fulfilled
  handover_materials: 365,     // 1 school year (D-19, Phase 6)
};

export interface ExpiredRecordInfo {
  category: string;
  count: number;
  oldestDate: Date | null;
}

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRetentionPolicyDto) {
    const existing = await this.prisma.retentionPolicy.findUnique({
      where: {
        schoolId_dataCategory: {
          schoolId: dto.schoolId,
          dataCategory: dto.dataCategory,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `A retention policy for category ${dto.dataCategory} already exists for this school. Use PUT to update.`,
      );
    }

    return this.prisma.retentionPolicy.create({
      data: {
        schoolId: dto.schoolId,
        dataCategory: dto.dataCategory,
        retentionDays: dto.retentionDays,
        isDefault: false,
      },
    });
  }

  async findBySchool(schoolId: string) {
    return this.prisma.retentionPolicy.findMany({
      where: { schoolId },
      orderBy: { dataCategory: 'asc' },
    });
  }

  async update(id: string, retentionDays: number) {
    const existing = await this.prisma.retentionPolicy.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Retention policy with ID ${id} was not found.`);
    }

    return this.prisma.retentionPolicy.update({
      where: { id },
      data: {
        retentionDays,
        isDefault: false,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.retentionPolicy.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Retention policy with ID ${id} was not found.`);
    }

    return this.prisma.retentionPolicy.delete({ where: { id } });
  }

  async getEffectivePolicy(schoolId: string, dataCategory: string): Promise<{ retentionDays: number; isDefault: boolean }> {
    const schoolPolicy = await this.prisma.retentionPolicy.findUnique({
      where: {
        schoolId_dataCategory: {
          schoolId,
          dataCategory,
        },
      },
    });

    if (schoolPolicy) {
      return { retentionDays: schoolPolicy.retentionDays, isDefault: schoolPolicy.isDefault };
    }

    const defaultDays = DEFAULT_RETENTION_DAYS[dataCategory];
    if (defaultDays !== undefined) {
      return { retentionDays: defaultDays, isDefault: true };
    }

    // Fallback for unknown categories: 5 years
    return { retentionDays: 1825, isDefault: true };
  }

  /**
   * Phase 6 (D-19): Delete HandoverNote rows older than the retention cutoff
   * along with their on-disk attachment files. Cascade removes
   * HandoverAttachment DB rows automatically via the schema FK; the filesystem
   * cleanup must be done explicitly because Prisma cannot traverse to disk.
   *
   * Called by the retention cron when iterating the `handover_materials`
   * category. Returns the number of notes deleted.
   */
  async cleanupHandoverMaterials(cutoffDate: Date): Promise<number> {
    const expired = await (this.prisma as any).handoverNote.findMany({
      where: { createdAt: { lt: cutoffDate } },
      include: { attachments: true },
    });

    let deleted = 0;
    for (const note of expired) {
      for (const att of note.attachments ?? []) {
        try {
          if (att.storagePath && existsSync(att.storagePath)) {
            unlinkSync(att.storagePath);
          }
        } catch (err) {
          this.logger.warn(
            `Failed to unlink handover attachment ${att.id} at ${att.storagePath}: ${(err as Error).message}`,
          );
        }
      }

      await (this.prisma as any).handoverNote.delete({ where: { id: note.id } });
      deleted++;
    }

    if (deleted > 0) {
      this.logger.log(
        `Deleted ${deleted} expired HandoverNote rows (cutoff: ${cutoffDate.toISOString()})`,
      );
    }
    return deleted;
  }

  async checkExpiredRecords(schoolId?: string): Promise<ExpiredRecordInfo[]> {
    const results: ExpiredRecordInfo[] = [];
    const now = new Date();

    // Get all schools to check, or a single school
    const schoolIds = schoolId
      ? [schoolId]
      : (await this.prisma.school.findMany({ select: { id: true } })).map((s) => s.id);

    for (const sid of schoolIds) {
      for (const [category, defaultDays] of Object.entries(DEFAULT_RETENTION_DAYS)) {
        const policy = await this.getEffectivePolicy(sid, category);
        const cutoffDate = new Date(now.getTime() - policy.retentionDays * 24 * 60 * 60 * 1000);

        // Check audit entries for audit-related categories
        if (category === 'audit_mutation' || category === 'audit_sensitive_read') {
          const auditCategory = category === 'audit_mutation' ? 'MUTATION' : 'SENSITIVE_READ';
          const count = await this.prisma.auditEntry.count({
            where: {
              category: auditCategory as any,
              createdAt: { lt: cutoffDate },
            },
          });

          if (count > 0) {
            const oldest = await this.prisma.auditEntry.findFirst({
              where: {
                category: auditCategory as any,
                createdAt: { lt: cutoffDate },
              },
              orderBy: { createdAt: 'asc' },
              select: { createdAt: true },
            });

            results.push({
              category: `${category}:${sid}`,
              count,
              oldestDate: oldest?.createdAt ?? null,
            });
          }
        }

        // Phase 6 (D-19): Handover materials cleanup. Counts expired rows and,
        // when iterating the processor, cleanupHandoverMaterials() does the
        // actual deletion. Here we just report the backlog so the dashboard
        // can show pending cleanup work.
        if (category === 'handover_materials') {
          const count = await (this.prisma as any).handoverNote.count({
            where: {
              createdAt: { lt: cutoffDate },
              schoolId: sid,
            },
          });

          if (count > 0) {
            const oldest = await (this.prisma as any).handoverNote.findFirst({
              where: {
                createdAt: { lt: cutoffDate },
                schoolId: sid,
              },
              orderBy: { createdAt: 'asc' },
              select: { createdAt: true },
            });

            results.push({
              category: `${category}:${sid}`,
              count,
              oldestDate: oldest?.createdAt ?? null,
            });
          }
        }
      }
    }

    return results;
  }
}
