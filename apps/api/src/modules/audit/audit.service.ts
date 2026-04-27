import { Injectable } from '@nestjs/common';
import Papa from 'papaparse';
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
   * Export audit entries as CSV string (D-05, D-16, D-25, AUDIT-VIEW-03).
   *
   * Returns UTF-8 BOM (`﻿`) + RFC-4180 CSV with semicolon delimiter and
   * `\r\n` line endings — German Excel opens umlauts correctly and treats
   * `;` as the default field separator (DACH locale).
   *
   * Column order (10 columns):
   *   Zeitpunkt;Benutzer;Email;Aktion;Ressource;Ressource-ID;Kategorie;
   *   IP-Adresse;Vorzustand;Nachzustand
   *
   * Hard-capped at 10,000 rows (T-15-02-03 — DoS guard against unbounded
   * export). Filters mirror `findAll`; role gate identical (admin sees all,
   * schulleitung sees pedagogical-only, others see own).
   */
  async exportCsv(params: {
    userId?: string;
    resource?: string;
    category?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    requestingUser: { id: string; roles: string[] };
  }): Promise<string> {
    const where: any = {};

    // Role-scoped visibility (D-06) — same as findAll
    if (params.requestingUser.roles.includes('admin')) {
      // Admin sees everything
    } else if (params.requestingUser.roles.includes('schulleitung')) {
      where.resource = { in: [...PEDAGOGICAL_RESOURCES] };
    } else {
      where.userId = params.requestingUser.id;
    }

    // Additional filters mirror findAll
    if (params.userId) where.userId = params.userId;
    if (params.resource) where.resource = params.resource;
    if (params.category) where.category = params.category;
    if (params.action) where.action = params.action;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const rows = await this.prisma.auditEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10_000,
    });

    // Benutzer/Email reserved for future Person-join enrichment; the
    // frontend already resolves user names via a separate query (D-05 v1).
    const csvRows = rows.map((r: any) => ({
      Zeitpunkt: r.createdAt.toISOString(),
      Benutzer: '',
      Email: '',
      Aktion: r.action,
      Ressource: r.resource,
      'Ressource-ID': r.resourceId ?? '',
      Kategorie: r.category,
      'IP-Adresse': r.ipAddress ?? '',
      Vorzustand: r.before ? JSON.stringify(r.before) : '',
      Nachzustand: r.metadata ? JSON.stringify(r.metadata) : '',
    }));

    const columns = [
      'Zeitpunkt',
      'Benutzer',
      'Email',
      'Aktion',
      'Ressource',
      'Ressource-ID',
      'Kategorie',
      'IP-Adresse',
      'Vorzustand',
      'Nachzustand',
    ];

    // Default `quotes: false` lets Papa only quote fields that contain the
    // delimiter, the quote character, or a newline — RFC-4180 minimal
    // quoting. `quotes: true` wraps every cell (incl. empty ones), which
    // breaks Excel's empty-trailing-column heuristics and bloats the file.
    let csv = Papa.unparse(csvRows, {
      delimiter: ';', // D-25 — DACH/Excel default
      newline: '\r\n',
      columns,
    });

    // Papa.unparse([]) returns '' — emit the header row manually so an
    // empty-result export still opens with column names visible.
    if (csvRows.length === 0) {
      csv = columns.join(';');
    }

    return '\uFEFF' + csv; // BOM for Excel UTF-8 detection
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
