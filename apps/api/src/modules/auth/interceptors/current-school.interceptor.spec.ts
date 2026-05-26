import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrentSchoolInterceptor } from './current-school.interceptor';

type MockReq = {
  user?: { id: string };
  headers: Record<string, string | string[] | undefined>;
  currentSchoolId?: string | null;
};

const buildExecutionContext = (req: MockReq, handler = vi.fn(), klass = vi.fn()) => ({
  switchToHttp: () => ({
    getRequest: () => req,
  }),
  getHandler: () => handler,
  getClass: () => klass,
});

const buildCallHandler = () => ({
  handle: () => of('next-result'),
});

describe('CurrentSchoolInterceptor', () => {
  let prisma: { person: { findMany: ReturnType<typeof vi.fn> } };
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let interceptor: CurrentSchoolInterceptor;

  beforeEach(() => {
    prisma = { person: { findMany: vi.fn() } };
    reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) };
    interceptor = new CurrentSchoolInterceptor(prisma as any, reflector as any);
  });

  it('skips and does not touch the DB on @Public() routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const req: MockReq = { user: { id: 'kc-1' }, headers: {} };
    const ctx = buildExecutionContext(req);

    const observable = (await interceptor.intercept(ctx as any, buildCallHandler() as any)) as any;
    await firstValueFrom(observable);

    expect(prisma.person.findMany).not.toHaveBeenCalled();
    expect(req.currentSchoolId).toBeUndefined();
  });

  it('skips when req.user is missing (auth rejected upstream)', async () => {
    const req: MockReq = { headers: {} };
    const ctx = buildExecutionContext(req);

    const observable = (await interceptor.intercept(ctx as any, buildCallHandler() as any)) as any;
    await firstValueFrom(observable);

    expect(prisma.person.findMany).not.toHaveBeenCalled();
    expect(req.currentSchoolId).toBeUndefined();
  });

  it('defaults to the first membership when no X-School-Id header is sent', async () => {
    prisma.person.findMany.mockResolvedValue([
      { schoolId: 'school-A' },
      { schoolId: 'school-B' },
    ]);
    const req: MockReq = { user: { id: 'kc-1' }, headers: {} };

    const observable = (await interceptor.intercept(
      buildExecutionContext(req) as any,
      buildCallHandler() as any,
    )) as any;
    await firstValueFrom(observable);

    expect(req.currentSchoolId).toBe('school-A');
  });

  it('requests memberships ordered by school.createdAt asc (deterministic first-membership pick, #152)', async () => {
    // Issue #152 — multi-membership admin users (admin KC user in seed +
    // throwaway e2e schools concurrently) would otherwise see Postgres
    // pick an arbitrary "first" membership for legacy specs that omit
    // X-School-Id. Locking the orderBy means seed (oldest) is always [0].
    prisma.person.findMany.mockResolvedValue([{ schoolId: 'seed' }]);
    const req: MockReq = { user: { id: 'kc-1' }, headers: {} };

    const observable = (await interceptor.intercept(
      buildExecutionContext(req) as any,
      buildCallHandler() as any,
    )) as any;
    await firstValueFrom(observable);

    expect(prisma.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { school: { createdAt: 'asc' } },
      }),
    );
  });

  it('honors a valid X-School-Id header that matches a membership', async () => {
    prisma.person.findMany.mockResolvedValue([
      { schoolId: 'school-A' },
      { schoolId: 'school-B' },
    ]);
    const req: MockReq = {
      user: { id: 'kc-1' },
      headers: { 'x-school-id': 'school-B' },
    };

    const observable = (await interceptor.intercept(
      buildExecutionContext(req) as any,
      buildCallHandler() as any,
    )) as any;
    await firstValueFrom(observable);

    expect(req.currentSchoolId).toBe('school-B');
  });

  it('handles array-form header (Fastify edge case) by taking the first value', async () => {
    prisma.person.findMany.mockResolvedValue([{ schoolId: 'school-A' }]);
    const req: MockReq = {
      user: { id: 'kc-1' },
      headers: { 'x-school-id': ['school-A', 'school-B'] },
    };

    const observable = (await interceptor.intercept(
      buildExecutionContext(req) as any,
      buildCallHandler() as any,
    )) as any;
    await firstValueFrom(observable);

    expect(req.currentSchoolId).toBe('school-A');
  });

  it('throws 403 when X-School-Id does not match any membership', async () => {
    prisma.person.findMany.mockResolvedValue([{ schoolId: 'school-A' }]);
    const req: MockReq = {
      user: { id: 'kc-1' },
      headers: { 'x-school-id': 'school-FOREIGN' },
    };

    await expect(
      interceptor.intercept(
        buildExecutionContext(req) as any,
        buildCallHandler() as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(req.currentSchoolId).toBeUndefined();
  });

  it('sets currentSchoolId to null for users with no Person row (admin-only KC accounts)', async () => {
    prisma.person.findMany.mockResolvedValue([]);
    const req: MockReq = { user: { id: 'kc-admin' }, headers: {} };

    const observable = (await interceptor.intercept(
      buildExecutionContext(req) as any,
      buildCallHandler() as any,
    )) as any;
    await firstValueFrom(observable);

    expect(req.currentSchoolId).toBeNull();
  });

  it('throws 403 when an admin without memberships sends X-School-Id (no implicit override)', async () => {
    prisma.person.findMany.mockResolvedValue([]);
    const req: MockReq = {
      user: { id: 'kc-admin' },
      headers: { 'x-school-id': 'school-A' },
    };

    await expect(
      interceptor.intercept(
        buildExecutionContext(req) as any,
        buildCallHandler() as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
