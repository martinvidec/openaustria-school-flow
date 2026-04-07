import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { SisService } from '../sis.service';
import { SisApiKeyGuard } from '../guards/sis-api-key.guard';
import { PrismaService } from '../../../config/database/prisma.service';

const mockPrisma = {
  sisApiKey: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  student: {
    findMany: vi.fn(),
  },
  teacher: {
    findMany: vi.fn(),
  },
  schoolClass: {
    findMany: vi.fn(),
  },
};

describe('SisService', () => {
  let service: SisService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        SisService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(SisService);
  });

  // IMPORT-04: SIS read-only API
  describe('IMPORT-04: SIS API with API key auth', () => {
    it('creates SisApiKey with UUID key', async () => {
      const schoolId = 'school-1';

      mockPrisma.sisApiKey.create.mockImplementation(async (args: any) => ({
        id: 'key-1',
        schoolId,
        key: args.data.key,
        name: 'Test Key',
        isActive: true,
        lastUsed: null,
        createdBy: 'user-1',
        createdAt: new Date('2026-01-01'),
      }));

      const result = await service.createApiKey(schoolId, 'Test Key', 'user-1');

      expect(result.key).toBeDefined();
      expect(result.key).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(result.name).toBe('Test Key');
      expect(result.isActive).toBe(true);
    });

    it('returns students for a school', async () => {
      mockPrisma.student.findMany.mockResolvedValue([
        {
          id: 'student-1',
          person: { firstName: 'Lisa', lastName: 'Muster' },
          schoolClass: { name: '1A' },
        },
      ]);

      const result = await service.getStudents('school-1');

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('Lisa');
      expect(result[0].lastName).toBe('Muster');
      expect(result[0].className).toBe('1A');
    });

    it('returns teachers for a school', async () => {
      mockPrisma.teacher.findMany.mockResolvedValue([
        {
          id: 'teacher-1',
          person: { firstName: 'Max', lastName: 'Mustermann' },
          qualifications: [{ subject: { name: 'Deutsch' } }],
        },
      ]);

      const result = await service.getTeachers('school-1');

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('Max');
      expect(result[0].lastName).toBe('Mustermann');
      expect(result[0].subjects).toContain('Deutsch');
    });

    it('returns classes for a school', async () => {
      mockPrisma.schoolClass.findMany.mockResolvedValue([
        {
          id: 'class-1',
          name: '1A',
          yearLevel: 5,
          _count: { students: 25 },
        },
      ]);

      const result = await service.getClasses('school-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('1A');
      expect(result[0].level).toBe(5);
      expect(result[0].studentCount).toBe(25);
    });

    it('deactivates API key on revoke', async () => {
      mockPrisma.sisApiKey.update.mockResolvedValue({
        id: 'key-1',
        isActive: false,
      });

      await service.revokeApiKey('key-1');

      expect(mockPrisma.sisApiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: { isActive: false },
      });
    });
  });
});

describe('SisApiKeyGuard', () => {
  let guard: SisApiKeyGuard;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        SisApiKeyGuard,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get(SisApiKeyGuard);
  });

  function createMockContext(headers: Record<string, string> = {}): ExecutionContext {
    const request: any = { headers, sisSchoolId: undefined };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;
  }

  it('rejects request without X-Api-Key header', async () => {
    const context = createMockContext({});
    const result = await guard.canActivate(context);
    expect(result).toBe(false);
  });

  it('rejects request with inactive API key', async () => {
    mockPrisma.sisApiKey.findFirst.mockResolvedValue(null); // No active key found

    const context = createMockContext({ 'x-api-key': 'invalid-key' });
    const result = await guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('updates lastUsed timestamp on successful request', async () => {
    mockPrisma.sisApiKey.findFirst.mockResolvedValue({
      id: 'key-1',
      schoolId: 'school-1',
      key: 'valid-key',
      isActive: true,
    });
    mockPrisma.sisApiKey.update.mockResolvedValue({});

    const context = createMockContext({ 'x-api-key': 'valid-key' });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockPrisma.sisApiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'key-1' },
        data: { lastUsed: expect.any(Date) },
      }),
    );

    // Verify sisSchoolId was set on request
    const req = context.switchToHttp().getRequest() as any;
    expect(req.sisSchoolId).toBe('school-1');
  });
});
