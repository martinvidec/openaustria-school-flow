import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';

// Sensitive resources that trigger read logging (D-05)
// Phase 2 additions: consent, export, person, retention (DSGVO-sensitive data)
export const SENSITIVE_RESOURCES = [
  'grades', 'student', 'teacher', 'user',
  'consent', 'export', 'person', 'retention',
] as const;

// Pedagogically relevant resources for Schulleitung visibility (D-06)
export const PEDAGOGICAL_RESOURCES = ['grades', 'classbook', 'student', 'teacher'] as const;

// Default retention per category in days (D-07: configurable per category)
export const DEFAULT_RETENTION_DAYS: Record<string, number> = {
  MUTATION: 1095, // 3 years (Austrian Aufbewahrungspflicht)
  SENSITIVE_READ: 365, // 1 year for read logs (less critical)
};

export interface AuditLogInput {
  userId: string;
  action: string; // 'create' | 'update' | 'delete' | 'read'
  resource: string;
  resourceId?: string;
  category: 'MUTATION' | 'SENSITIVE_READ';
  metadata?: Record<string, unknown>;
  before?: Record<string, unknown> | null; // pre-mutation snapshot, sanitized (D-10, D-24)
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    return this.prisma.auditEntry.create({
      data: {
        userId: input.userId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        category: input.category as any,
        metadata: input.metadata as any,
        before: input.before as any, // pre-mutation snapshot (D-10)
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  /**
   * Query audit entries with role-scoped visibility (D-06):
   * - Admin: all entries
   * - Schulleitung: pedagogical entries only (grades, classbook, student, teacher)
   * - Other users: only their own entries (DSGVO Art. 15)
   */
  async findAll(params: {
    userId?: string;
    resource?: string;
    category?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page: number;
    limit: number;
    requestingUser: { id: string; roles: string[] };
  }) {
    const where: any = {};

    // Role-scoped visibility (D-06)
    if (params.requestingUser.roles.includes('admin')) {
      // Admin sees everything
    } else if (params.requestingUser.roles.includes('schulleitung')) {
      // Schulleitung sees pedagogical entries
      where.resource = { in: [...PEDAGOGICAL_RESOURCES] };
    } else {
      // Other users see only their own entries
      where.userId = params.requestingUser.id;
    }

    // Additional filters
    if (params.userId) where.userId = params.userId;
    if (params.resource) where.resource = params.resource;
    if (params.category) where.category = params.category;
    if (params.action) where.action = params.action;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.auditEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.auditEntry.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  /**
   * Cleanup old audit entries based on per-category retention policy (D-07).
   * Admin can override defaults per category.
   *
   * @param retentionConfig - Map of category to retention days.
   *   Defaults: MUTATION = 1095 days (3 years), SENSITIVE_READ = 365 days (1 year).
   */
  async cleanup(retentionConfig?: Record<string, number>) {
    const config = { ...DEFAULT_RETENTION_DAYS, ...retentionConfig };
    const results: Array<{
      category: string;
      deletedCount: number;
      cutoffDate: Date;
    }> = [];

    for (const [category, retentionDays] of Object.entries(config)) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);

      const result = await this.prisma.auditEntry.deleteMany({
        where: {
          category: category as any,
          createdAt: { lt: cutoff },
        },
      });

      results.push({
        category,
        deletedCount: result.count,
        cutoffDate: cutoff,
      });
    }

    return results;
  }
}
