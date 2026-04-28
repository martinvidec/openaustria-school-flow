import { describe, it, expect, beforeEach, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import type { AuditService } from './audit.service';
import type { PrismaService } from '../../config/database/prisma.service';

describe('AuditInterceptor', () => {
  let auditService: { log: any };
  let prisma: any;
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    auditService = { log: vi.fn().mockResolvedValue(undefined) };
    prisma = {
      retentionPolicy: { findUnique: vi.fn() },
      consentRecord: { findUnique: vi.fn() },
    };
    interceptor = new AuditInterceptor(
      auditService as unknown as AuditService,
      prisma as unknown as PrismaService,
    );
  });

  function ctx(method: string, url: string, params: any, body: any) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          url,
          params,
          body,
          ip: '127.0.0.1',
          headers: { 'user-agent': 'test' },
          user: { id: 'u1', roles: ['admin'] },
        }),
      }),
    } as any;
  }

  it('captures pre-state for PUT on mapped resource', async () => {
    const pre = { id: 'r1', dataCategory: 'MUTATION', retentionDays: 365 };
    prisma.retentionPolicy.findUnique.mockResolvedValue(pre);
    await firstValueFrom(
      interceptor.intercept(
        ctx('PUT', '/api/v1/retention/r1', { id: 'r1' }, { retentionDays: 730 }),
        { handle: () => of({ id: 'r1' }) },
      ),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update',
        resource: 'retention',
        resourceId: 'r1',
        before: pre,
        metadata: { body: { retentionDays: 730 } },
      }),
    );
  });

  it('captures pre-state for DELETE on mapped resource', async () => {
    const pre = { id: 'c1', purpose: 'STATISTIK', granted: true };
    prisma.consentRecord.findUnique.mockResolvedValue(pre);
    await firstValueFrom(
      interceptor.intercept(
        ctx('DELETE', '/api/v1/consent/c1', { id: 'c1' }, undefined),
        { handle: () => of({ id: 'c1' }) },
      ),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'delete',
        resource: 'consent',
        before: pre,
        metadata: undefined,
      }),
    );
  });

  it('leaves before=undefined for unmapped resources', async () => {
    await firstValueFrom(
      interceptor.intercept(
        ctx('PUT', '/api/v1/some-unknown-thing/x1', { id: 'x1' }, { foo: 1 }),
        { handle: () => of({ id: 'x1' }) },
      ),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ before: undefined }),
    );
  });

  it('leaves before=undefined when DB lookup throws', async () => {
    prisma.retentionPolicy.findUnique.mockRejectedValue(new Error('boom'));
    await firstValueFrom(
      interceptor.intercept(
        ctx('PUT', '/api/v1/retention/r1', { id: 'r1' }, { retentionDays: 999 }),
        { handle: () => of({ id: 'r1' }) },
      ),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ before: undefined }),
    );
  });

  it('redacts password/secret/token/credential from before', async () => {
    prisma.consentRecord.findUnique.mockResolvedValue({
      id: 'c1',
      granted: true,
      password: 'p',
      secret: 's',
      token: 't',
      credential: 'c',
    });
    await firstValueFrom(
      interceptor.intercept(
        ctx('PUT', '/api/v1/consent/c1', { id: 'c1' }, { granted: false }),
        { handle: () => of({ id: 'c1' }) },
      ),
    );
    const call = auditService.log.mock.calls[0][0];
    expect(call.before.password).toBe('[REDACTED]');
    expect(call.before.secret).toBe('[REDACTED]');
    expect(call.before.token).toBe('[REDACTED]');
    expect(call.before.credential).toBe('[REDACTED]');
  });

  it('does NOT redact email/phone (D-24)', async () => {
    prisma.consentRecord.findUnique.mockResolvedValue({
      id: 'c1',
      email: 'a@b.c',
      phone: '+431',
    });
    await firstValueFrom(
      interceptor.intercept(
        ctx('PUT', '/api/v1/consent/c1', { id: 'c1' }, { granted: true }),
        { handle: () => of({ id: 'c1' }) },
      ),
    );
    const call = auditService.log.mock.calls[0][0];
    expect(call.before.email).toBe('a@b.c');
    expect(call.before.phone).toBe('+431');
  });

  it('preserves metadata.body shape for POST and skips DB lookup', async () => {
    await firstValueFrom(
      interceptor.intercept(
        ctx('POST', '/api/v1/retention', undefined, {
          dataCategory: 'X',
          retentionDays: 100,
        }),
        { handle: () => of({ id: 'r-new' }) },
      ),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'create',
        metadata: { body: { dataCategory: 'X', retentionDays: 100 } },
        before: undefined,
      }),
    );
    expect(prisma.retentionPolicy.findUnique).not.toHaveBeenCalled();
  });

  describe('extractResource URL parsing — DSGVO sub-resource walk (15-12)', () => {
    beforeEach(() => {
      // Extend the per-test prisma mock with DSGVO sub-resource delegates that
      // the existing top-level beforeEach does not cover.
      prisma.dsfaEntry = { findUnique: vi.fn().mockResolvedValue(null) };
      prisma.vvzEntry = { findUnique: vi.fn().mockResolvedValue(null) };
    });

    it('walks past dsgvo for /api/v1/dsgvo/consent/grant → resource=consent', async () => {
      prisma.consentRecord.findUnique.mockResolvedValue({ id: 'grant', granted: false });
      await firstValueFrom(
        interceptor.intercept(
          ctx('PUT', '/api/v1/dsgvo/consent/grant', { id: 'grant' }, { granted: true }),
          { handle: () => of({ id: 'grant' }) },
        ),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ resource: 'consent' }),
      );
    });

    it('walks past dsgvo for /api/v1/dsgvo/retention/:id → resource=retention + prisma.retentionPolicy.findUnique fired', async () => {
      prisma.retentionPolicy.findUnique.mockResolvedValue({ id: 'uuid-123', dataCategory: 'X', retentionDays: 365 });
      await firstValueFrom(
        interceptor.intercept(
          ctx('PUT', '/api/v1/dsgvo/retention/uuid-123', { id: 'uuid-123' }, { retentionDays: 730 }),
          { handle: () => of({ id: 'uuid-123' }) },
        ),
      );
      expect(prisma.retentionPolicy.findUnique).toHaveBeenCalledWith({ where: { id: 'uuid-123' } });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ resource: 'retention', resourceId: 'uuid-123' }),
      );
    });

    it('walks past dsgvo for /api/v1/dsgvo/dsfa/:id → resource=dsfa', async () => {
      await firstValueFrom(
        interceptor.intercept(
          ctx('PUT', '/api/v1/dsgvo/dsfa/uuid-123', { id: 'uuid-123' }, { name: 'X' }),
          { handle: () => of({ id: 'uuid-123' }) },
        ),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ resource: 'dsfa' }),
      );
    });

    it('walks past dsgvo for /api/v1/dsgvo/vvz/:id → resource=vvz', async () => {
      await firstValueFrom(
        interceptor.intercept(
          ctx('PUT', '/api/v1/dsgvo/vvz/uuid-123', { id: 'uuid-123' }, { name: 'X' }),
          { handle: () => of({ id: 'uuid-123' }) },
        ),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ resource: 'vvz' }),
      );
    });

    it('walks past dsgvo for POST /api/v1/dsgvo/export → resource=export', async () => {
      await firstValueFrom(
        interceptor.intercept(
          ctx('POST', '/api/v1/dsgvo/export', undefined, { personId: 'p1', schoolId: 's1' }),
          { handle: () => of({ id: 'job-1' }) },
        ),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ resource: 'export', action: 'create' }),
      );
    });

    it('walks past dsgvo for POST /api/v1/dsgvo/export/:id → resource=export', async () => {
      await firstValueFrom(
        interceptor.intercept(
          ctx('POST', '/api/v1/dsgvo/export/uuid-123', undefined, { foo: 1 }),
          { handle: () => of({ id: 'job-2' }) },
        ),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ resource: 'export' }),
      );
    });

    it('walks past dsgvo for POST /api/v1/dsgvo/deletion/:id → resource=deletion', async () => {
      await firstValueFrom(
        interceptor.intercept(
          ctx('POST', '/api/v1/dsgvo/deletion/uuid-123', undefined, { confirmation: 'X' }),
          { handle: () => of({ id: 'job-3' }) },
        ),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ resource: 'deletion' }),
      );
    });

    it('extractResource(/api/v1/dsgvo/jobs) === "jobs"', () => {
      expect((interceptor as any).extractResource('/api/v1/dsgvo/jobs')).toBe('jobs');
    });

    it('non-DSGVO regression: extractResource(/api/v1/schools/uuid-123) === "schools"', () => {
      expect((interceptor as any).extractResource('/api/v1/schools/uuid-123')).toBe('schools');
    });

    it('non-DSGVO regression: extractResource(/api/v1/audit) === "audit"', () => {
      expect((interceptor as any).extractResource('/api/v1/audit')).toBe('audit');
    });

    it('bare /api/v1/dsgvo (no sub-segment) → resource=dsgvo (defensive fallback)', () => {
      expect((interceptor as any).extractResource('/api/v1/dsgvo')).toBe('dsgvo');
    });

    it('unknown DSGVO sub-resource → resource=dsgvo (NOT auto-promoted)', () => {
      expect((interceptor as any).extractResource('/api/v1/dsgvo/foo/x')).toBe('dsgvo');
    });
  });
});
