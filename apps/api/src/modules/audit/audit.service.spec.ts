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
