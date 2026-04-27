import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { DsgvoJobsService } from './dsgvo-jobs.service';
import {
  DsgvoJobStatusFilter,
  DsgvoJobTypeFilter,
  QueryDsgvoJobsDto,
} from './dto/query-dsgvo-jobs.dto';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user';

function buildQuery(overrides: Partial<QueryDsgvoJobsDto> = {}): QueryDsgvoJobsDto {
  const q = new QueryDsgvoJobsDto();
  q.schoolId = overrides.schoolId ?? '00000000-0000-0000-0000-000000000001';
  q.page = overrides.page ?? 1;
  q.limit = overrides.limit ?? 20;
  if (overrides.status !== undefined) q.status = overrides.status;
  if (overrides.jobType !== undefined) q.jobType = overrides.jobType;
  return q;
}

const adminUser = (): AuthenticatedUser => ({
  id: 'u-admin',
  email: 'admin@school.test',
  username: 'admin',
  roles: ['admin'],
});

describe('DsgvoJobsService.findAllForAdmin', () => {
  let prisma: any;
  let svc: DsgvoJobsService;

  beforeEach(() => {
    prisma = {
      dsgvoJob: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      person: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    svc = new DsgvoJobsService(prisma);
  });

  it('throws ForbiddenException for schulleitung/lehrer/eltern/schueler', async () => {
    for (const role of ['schulleitung', 'lehrer', 'eltern', 'schueler']) {
      const user: AuthenticatedUser = { ...adminUser(), roles: [role] };
      await expect(svc.findAllForAdmin(buildQuery(), user)).rejects.toThrow(ForbiddenException);
    }
    expect(prisma.dsgvoJob.findMany).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when schoolId is empty', async () => {
    const q = buildQuery({ schoolId: '' as any });
    await expect(svc.findAllForAdmin(q, adminUser())).rejects.toThrow(BadRequestException);
    expect(prisma.dsgvoJob.findMany).not.toHaveBeenCalled();
  });

  it('scopes findMany by schoolId only when no other filter is given', async () => {
    await svc.findAllForAdmin(buildQuery(), adminUser());
    const args = prisma.dsgvoJob.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ schoolId: '00000000-0000-0000-0000-000000000001' });
    expect(args.where).not.toHaveProperty('status');
    expect(args.where).not.toHaveProperty('jobType');
  });

  it('adds status filter when provided', async () => {
    await svc.findAllForAdmin(
      buildQuery({ status: DsgvoJobStatusFilter.PROCESSING }),
      adminUser(),
    );
    const args = prisma.dsgvoJob.findMany.mock.calls[0][0];
    expect(args.where.status).toBe('PROCESSING');
  });

  it('adds jobType filter when provided', async () => {
    await svc.findAllForAdmin(
      buildQuery({ jobType: DsgvoJobTypeFilter.DATA_DELETION }),
      adminUser(),
    );
    const args = prisma.dsgvoJob.findMany.mock.calls[0][0];
    expect(args.where.jobType).toBe('DATA_DELETION');
  });

  it('orders by createdAt desc', async () => {
    await svc.findAllForAdmin(buildQuery(), adminUser());
    const args = prisma.dsgvoJob.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('hydrates Person via a tenant-scoped follow-up query', async () => {
    prisma.dsgvoJob.findMany.mockResolvedValue([
      {
        id: 'j1',
        schoolId: '00000000-0000-0000-0000-000000000001',
        personId: 'p1',
        jobType: 'DATA_EXPORT',
        status: 'COMPLETED',
      },
      {
        id: 'j2',
        schoolId: '00000000-0000-0000-0000-000000000001',
        personId: 'p2',
        jobType: 'DATA_DELETION',
        status: 'QUEUED',
      },
      {
        id: 'j3',
        schoolId: '00000000-0000-0000-0000-000000000001',
        personId: null,
        jobType: 'RETENTION_CLEANUP',
        status: 'COMPLETED',
      },
    ]);
    prisma.dsgvoJob.count.mockResolvedValue(3);
    prisma.person.findMany.mockResolvedValue([
      { id: 'p1', firstName: 'Maria', lastName: 'Müller', email: 'maria@x.at' },
      { id: 'p2', firstName: 'Hans', lastName: 'Huber', email: null },
    ]);

    const result = await svc.findAllForAdmin(buildQuery(), adminUser());

    // Person follow-up query must be tenant-scoped + select-narrow
    const personArgs = prisma.person.findMany.mock.calls[0][0];
    expect(personArgs.where).toEqual({
      id: { in: ['p1', 'p2'] },
      schoolId: '00000000-0000-0000-0000-000000000001',
    });
    expect(personArgs.select).toEqual({
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    });

    // Each row carries the joined person summary or null
    expect(result.data[0].person).toEqual({
      id: 'p1',
      firstName: 'Maria',
      lastName: 'Müller',
      email: 'maria@x.at',
    });
    expect(result.data[1].person).toEqual({
      id: 'p2',
      firstName: 'Hans',
      lastName: 'Huber',
      email: null,
    });
    expect(result.data[2].person).toBeNull(); // RETENTION_CLEANUP -> personId null
  });

  it('skips Person hydration when no jobs have personId', async () => {
    prisma.dsgvoJob.findMany.mockResolvedValue([
      { id: 'j1', personId: null, jobType: 'RETENTION_CLEANUP', status: 'QUEUED' },
    ]);
    prisma.dsgvoJob.count.mockResolvedValue(1);

    const result = await svc.findAllForAdmin(buildQuery(), adminUser());

    expect(prisma.person.findMany).not.toHaveBeenCalled();
    expect(result.data[0].person).toBeNull();
  });

  it('returns paginated envelope { data, meta } with correct totalPages', async () => {
    prisma.dsgvoJob.findMany.mockResolvedValue([
      { id: 'j1', personId: null, jobType: 'RETENTION_CLEANUP', status: 'COMPLETED' },
      { id: 'j2', personId: null, jobType: 'RETENTION_CLEANUP', status: 'COMPLETED' },
    ]);
    prisma.dsgvoJob.count.mockResolvedValue(45);
    const result = await svc.findAllForAdmin(buildQuery({ page: 2, limit: 10 }), adminUser());
    expect(result.data).toHaveLength(2);
    expect(result.meta).toEqual({ page: 2, limit: 10, total: 45, totalPages: 5 });
  });
});
