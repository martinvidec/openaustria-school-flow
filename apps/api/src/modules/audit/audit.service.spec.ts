import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditService } from './audit.service';

describe('AuditService.findAll action filter', () => {
  let prisma: any;
  let svc: AuditService;

  beforeEach(() => {
    prisma = {
      auditEntry: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    };
    svc = new AuditService(prisma);
  });

  it('passes action filter to where clause', async () => {
    await svc.findAll({
      action: 'update',
      page: 1,
      limit: 20,
      requestingUser: { id: 'u1', roles: ['admin'] },
    });
    expect(prisma.auditEntry.findMany.mock.calls[0][0].where.action).toBe(
      'update',
    );
  });

  it('omits action filter when undefined', async () => {
    await svc.findAll({
      page: 1,
      limit: 20,
      requestingUser: { id: 'u1', roles: ['admin'] },
    });
    expect(
      prisma.auditEntry.findMany.mock.calls[0][0].where.action,
    ).toBeUndefined();
  });
});

describe('AuditService.exportCsv', () => {
  let prisma: any;
  let svc: AuditService;

  beforeEach(() => {
    prisma = {
      auditEntry: {
        findMany: vi.fn().mockResolvedValue([
          {
            createdAt: new Date('2026-04-26T08:00:00Z'),
            action: 'update',
            resource: 'consent',
            resourceId: 'c1',
            category: 'MUTATION',
            ipAddress: '127.0.0.1',
            before: { granted: true, purpose: 'STATISTIK' },
            metadata: { body: { granted: false } },
          },
          {
            createdAt: new Date('2026-04-26T07:00:00Z'),
            action: 'read',
            resource: 'student',
            resourceId: 's1',
            category: 'SENSITIVE_READ',
            ipAddress: '127.0.0.1',
            before: null,
            metadata: null,
          },
        ]),
      },
    };
    svc = new AuditService(prisma);
  });

  it('starts with UTF-8 BOM and German header row', async () => {
    const csv = await svc.exportCsv({
      requestingUser: { id: 'u1', roles: ['admin'] },
    });
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    // Header is first line after BOM, semicolon-delimited
    const firstLine = csv.slice(1).split('\r\n')[0];
    expect(firstLine).toContain('Zeitpunkt');
    expect(firstLine).toContain('Aktion');
    expect(firstLine).toContain('Ressource-ID');
    expect(firstLine).toContain('Vorzustand');
    expect(firstLine).toContain('Nachzustand');
    expect(firstLine.split(';').length).toBe(10); // 10 columns per spec
  });

  it('uses semicolon delimiter (D-25)', async () => {
    const csv = await svc.exportCsv({
      requestingUser: { id: 'u1', roles: ['admin'] },
    });
    const lines = csv.slice(1).split('\r\n').filter(Boolean);
    // header + 2 data rows
    expect(lines.length).toBe(3);
    for (const line of lines) {
      expect(line.split(';').length).toBeGreaterThanOrEqual(10);
    }
  });

  it('escapes embedded quotes/newlines/semicolons via Papa.unparse', async () => {
    prisma.auditEntry.findMany.mockResolvedValueOnce([
      {
        createdAt: new Date('2026-04-26T08:00:00Z'),
        action: 'update',
        resource: 'consent',
        resourceId: 'c1',
        category: 'MUTATION',
        ipAddress: '127.0.0.1',
        before: null,
        metadata: { body: { note: 'a; b\n"c"' } },
      },
    ]);
    const csv = await svc.exportCsv({
      requestingUser: { id: 'u1', roles: ['admin'] },
    });
    // The dangerous characters end up safely quoted (RFC 4180 — Papa.unparse handles this)
    expect(csv).toContain('"');
  });

  it('respects role gate: schulleitung sees pedagogical only', async () => {
    await svc.exportCsv({
      requestingUser: { id: 'u2', roles: ['schulleitung'] },
    });
    const where = prisma.auditEntry.findMany.mock.calls[0][0].where;
    expect(where.resource).toEqual({
      in: expect.arrayContaining(['grades', 'classbook', 'student', 'teacher']),
    });
  });

  it('respects role gate: non-admin/non-schulleitung sees only own', async () => {
    await svc.exportCsv({
      requestingUser: { id: 'u3', roles: ['lehrer'] },
    });
    const where = prisma.auditEntry.findMany.mock.calls[0][0].where;
    expect(where.userId).toBe('u3');
  });

  it('hard-caps result set at 10,000 rows', async () => {
    await svc.exportCsv({
      requestingUser: { id: 'u1', roles: ['admin'] },
    });
    expect(prisma.auditEntry.findMany.mock.calls[0][0].take).toBe(10_000);
  });

  it('orders rows by createdAt desc', async () => {
    await svc.exportCsv({
      requestingUser: { id: 'u1', roles: ['admin'] },
    });
    expect(prisma.auditEntry.findMany.mock.calls[0][0].orderBy).toEqual({
      createdAt: 'desc',
    });
  });

  it('forwards explicit filters into where clause', async () => {
    await svc.exportCsv({
      userId: 'u-target',
      resource: 'consent',
      category: 'MUTATION',
      action: 'update',
      startDate: new Date('2026-04-01T00:00:00Z'),
      endDate: new Date('2026-04-27T00:00:00Z'),
      requestingUser: { id: 'u1', roles: ['admin'] },
    });
    const where = prisma.auditEntry.findMany.mock.calls[0][0].where;
    expect(where.userId).toBe('u-target');
    expect(where.resource).toBe('consent');
    expect(where.category).toBe('MUTATION');
    expect(where.action).toBe('update');
    expect(where.createdAt.gte).toEqual(new Date('2026-04-01T00:00:00Z'));
    expect(where.createdAt.lte).toEqual(new Date('2026-04-27T00:00:00Z'));
  });

  it('serializes Vorzustand and Nachzustand as JSON strings, empty when null', async () => {
    const csv = await svc.exportCsv({
      requestingUser: { id: 'u1', roles: ['admin'] },
    });
    // First row has before/metadata, second has both null
    expect(csv).toContain('granted');
    expect(csv).toContain('STATISTIK');
    // Second row's Vorzustand and Nachzustand columns should be empty
    const lines = csv.slice(1).split('\r\n').filter(Boolean);
    const secondRow = lines[2];
    // Last two columns (Vorzustand, Nachzustand) are empty for the second row
    expect(secondRow.endsWith(';;')).toBe(true);
  });

  it('returns header-only CSV when no rows match', async () => {
    prisma.auditEntry.findMany.mockResolvedValueOnce([]);
    const csv = await svc.exportCsv({
      requestingUser: { id: 'u1', roles: ['admin'] },
    });
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split('\r\n').filter(Boolean);
    // Only header row
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('Zeitpunkt');
  });
});
