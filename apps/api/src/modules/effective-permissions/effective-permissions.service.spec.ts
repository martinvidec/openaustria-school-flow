import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { EffectivePermissionsService } from './effective-permissions.service';
import { PrismaService } from '../../config/database/prisma.service';

const mockPrisma = {
  userRole: {
    findMany: vi.fn(),
  },
  permission: {
    findMany: vi.fn(),
  },
  permissionOverride: {
    findMany: vi.fn(),
  },
};

describe('EffectivePermissionsService', () => {
  let service: EffectivePermissionsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EffectivePermissionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<EffectivePermissionsService>(EffectivePermissionsService);
  });

  it('admin role alone → 1 row manage/all/source=role:admin', async () => {
    mockPrisma.userRole.findMany.mockResolvedValue([
      { role: { name: 'admin' } },
    ]);
    mockPrisma.permission.findMany.mockResolvedValue([
      {
        action: 'manage',
        subject: 'all',
        conditions: null,
        inverted: false,
        role: { name: 'admin' },
      },
    ]);
    mockPrisma.permissionOverride.findMany.mockResolvedValue([]);

    const rows = await service.resolve('kc-1');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: 'manage',
      subject: 'all',
      granted: true,
      source: { kind: 'role', roleName: 'admin' },
      reason: null,
    });
  });

  it('lehrer + eltern → union of role perms with distinct source chips', async () => {
    mockPrisma.userRole.findMany.mockResolvedValue([
      { role: { name: 'lehrer' } },
      { role: { name: 'eltern' } },
    ]);
    mockPrisma.permission.findMany.mockResolvedValue([
      {
        action: 'read',
        subject: 'student',
        conditions: null,
        inverted: false,
        role: { name: 'lehrer' },
      },
      {
        action: 'read',
        subject: 'grades',
        conditions: { childId: '{{ id }}' },
        inverted: false,
        role: { name: 'eltern' },
      },
    ]);
    mockPrisma.permissionOverride.findMany.mockResolvedValue([]);

    const rows = await service.resolve('kc-1');
    expect(rows).toHaveLength(2);
    const sources = rows.map((r) => (r.source.kind === 'role' ? r.source.roleName : 'override'));
    expect(sources).toEqual(expect.arrayContaining(['lehrer', 'eltern']));
  });

  it('lehrer + override grant read/grades → base + override row', async () => {
    mockPrisma.userRole.findMany.mockResolvedValue([{ role: { name: 'lehrer' } }]);
    mockPrisma.permission.findMany.mockResolvedValue([
      {
        action: 'read',
        subject: 'student',
        conditions: null,
        inverted: false,
        role: { name: 'lehrer' },
      },
    ]);
    mockPrisma.permissionOverride.findMany.mockResolvedValue([
      {
        action: 'read',
        subject: 'grades',
        conditions: null,
        granted: true,
        reason: 'Vertretung',
      },
    ]);

    const rows = await service.resolve('kc-1');
    expect(rows).toHaveLength(2);
    const overrideRow = rows.find((r) => r.source.kind === 'override');
    expect(overrideRow).toBeDefined();
    expect(overrideRow!.reason).toBe('Vertretung');
    expect(overrideRow!.granted).toBe(true);
  });

  it('lehrer + override deny read/student → base + negation override', async () => {
    mockPrisma.userRole.findMany.mockResolvedValue([{ role: { name: 'lehrer' } }]);
    mockPrisma.permission.findMany.mockResolvedValue([
      {
        action: 'read',
        subject: 'student',
        conditions: null,
        inverted: false,
        role: { name: 'lehrer' },
      },
    ]);
    mockPrisma.permissionOverride.findMany.mockResolvedValue([
      {
        action: 'read',
        subject: 'student',
        conditions: null,
        granted: false,
        reason: 'Probezeit',
      },
    ]);

    const rows = await service.resolve('kc-1');
    expect(rows).toHaveLength(2);
    const negation = rows.find((r) => r.source.kind === 'override');
    expect(negation!.granted).toBe(false);
  });

  it('override conditions { userId: "{{ id }}" } → pre-interpolated userId', async () => {
    mockPrisma.userRole.findMany.mockResolvedValue([]);
    mockPrisma.permission.findMany.mockResolvedValue([]);
    mockPrisma.permissionOverride.findMany.mockResolvedValue([
      {
        action: 'read',
        subject: 'student',
        conditions: { userId: '{{ id }}' },
        granted: true,
        reason: 'self-only',
      },
    ]);

    const rows = await service.resolve('kc-USER-42');
    expect(rows).toHaveLength(1);
    expect(rows[0].conditions).toEqual({ userId: '{{ id }}' });
    expect(rows[0].interpolatedConditions).toEqual({ userId: 'kc-USER-42' });
  });
});
