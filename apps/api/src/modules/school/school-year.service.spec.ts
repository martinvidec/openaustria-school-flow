import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SchoolYearService } from './school-year.service';
import { PrismaService } from '../../config/database/prisma.service';

describe('SchoolYearService', () => {
  let service: SchoolYearService;
  let prisma: any;

  const mockYear = {
    id: 'year-1',
    schoolId: 'school-1',
    name: '2026/2027',
    startDate: new Date('2026-09-01'),
    semesterBreak: new Date('2027-02-07'),
    endDate: new Date('2027-07-04'),
    isActive: false,
  };

  const mockPrismaService: any = {
    schoolYear: {
      create: vi.fn().mockResolvedValue(mockYear),
      findMany: vi.fn().mockResolvedValue([mockYear]),
      findUnique: vi.fn().mockResolvedValue(mockYear),
      findFirst: vi.fn().mockResolvedValue(mockYear),
      update: vi.fn().mockResolvedValue(mockYear),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      delete: vi.fn().mockResolvedValue(mockYear),
    },
    schoolClass: {
      count: vi.fn().mockResolvedValue(0),
    },
    teachingReduction: {
      count: vi.fn().mockResolvedValue(0),
    },
    // $transaction executes the callback with this same mock service as tx
    $transaction: vi.fn(async (cb: any) => cb(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolYearService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SchoolYearService>(SchoolYearService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: create
  it('create() calls prisma.schoolYear.create with schoolId and dto fields', async () => {
    const dto = {
      name: '2026/2027',
      startDate: '2026-09-01',
      semesterBreak: '2027-02-07',
      endDate: '2027-07-04',
    } as any;
    await service.create('school-1', dto);

    expect(prisma.schoolYear.create).toHaveBeenCalledTimes(1);
    const arg = prisma.schoolYear.create.mock.calls[0][0];
    expect(arg.data.schoolId).toBe('school-1');
    expect(arg.data.name).toBe('2026/2027');
    // isActive defaults to false when not specified in DTO
    expect(arg.data.isActive).toBe(false);
  });

  // Test 2: findAll
  it('findAll(schoolId) queries findMany with the schoolId and orderBy startDate desc', async () => {
    await service.findAll('school-1');
    expect(prisma.schoolYear.findMany).toHaveBeenCalledTimes(1);
    const arg = prisma.schoolYear.findMany.mock.calls[0][0];
    expect(arg.where).toEqual({ schoolId: 'school-1' });
    expect(arg.orderBy).toEqual({ startDate: 'desc' });
  });

  // Test 3: activate is atomic via $transaction
  it('activate() runs a $transaction that first updateMany(active→inactive), then update(target→active)', async () => {
    await service.activate('school-1', 'year-2');

    // $transaction was invoked
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    // Inside the callback, updateMany + update were both called
    expect(prisma.schoolYear.updateMany).toHaveBeenCalledWith({
      where: { schoolId: 'school-1', isActive: true },
      data: { isActive: false },
    });
    expect(prisma.schoolYear.update).toHaveBeenCalledWith({
      where: { id: 'year-2' },
      data: { isActive: true },
    });

    // Assertion: updateMany must be called BEFORE update in the tx body
    const updateManyOrder = prisma.schoolYear.updateMany.mock.invocationCallOrder[0];
    const updateOrder = prisma.schoolYear.update.mock.invocationCallOrder[0];
    expect(updateManyOrder).toBeLessThan(updateOrder);
  });

  // Test 4a: remove() throws NotFoundException when year does not exist
  it('remove() throws NotFoundException when the year does not exist', async () => {
    prisma.schoolYear.findUnique.mockResolvedValueOnce(null);
    await expect(service.remove('missing-year')).rejects.toThrow(NotFoundException);
  });

  // Test 4b: remove() throws ConflictException when year is active
  it('remove() throws ConflictException with "Aktives Schuljahr" message when the year is active', async () => {
    prisma.schoolYear.findUnique.mockResolvedValueOnce({ ...mockYear, isActive: true });
    try {
      await service.remove('year-1');
      throw new Error('expected ConflictException');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ConflictException);
      const response = e.getResponse();
      const message = typeof response === 'string' ? response : (response.message ?? '');
      expect(String(message)).toContain('Aktives Schuljahr');
    }
  });

  // Test 5: orphan-guard — references present → ConflictException with referenceCount + wird noch von N Eintraegen verwendet
  it('remove() throws ConflictException with referenceCount when SchoolClass or TeachingReduction rows reference the year', async () => {
    prisma.schoolYear.findUnique.mockResolvedValueOnce({ ...mockYear, isActive: false });
    prisma.schoolClass.count.mockResolvedValueOnce(2);
    prisma.teachingReduction.count.mockResolvedValueOnce(1);

    try {
      await service.remove('year-1');
      throw new Error('expected ConflictException');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ConflictException);
      const response = e.getResponse();
      // Structured body must carry referenceCount (sum = 3)
      expect(typeof response).toBe('object');
      expect(response.referenceCount).toBe(3);
      const text = response.message ?? response.detail ?? '';
      expect(text).toMatch(/wird noch von .* Eintraegen verwendet/);
    }

    // Delete must NOT have been attempted
    expect(prisma.schoolYear.delete).not.toHaveBeenCalled();
  });

  // Test 6: remove() succeeds when not-active and no references
  it('remove() deletes the year when it is not active and has no references', async () => {
    prisma.schoolYear.findUnique.mockResolvedValueOnce({ ...mockYear, isActive: false });
    prisma.schoolClass.count.mockResolvedValueOnce(0);
    prisma.teachingReduction.count.mockResolvedValueOnce(0);

    await service.remove('year-1');
    expect(prisma.schoolYear.delete).toHaveBeenCalledWith({ where: { id: 'year-1' } });
  });

  // Orphan-guard scope: must query ONLY SchoolClass + TeachingReduction (not TimetableRun, not ClassBookEntry)
  it('remove() orphan-check queries SchoolClass AND TeachingReduction ONLY (not TimetableRun/ClassBookEntry)', async () => {
    prisma.schoolYear.findUnique.mockResolvedValueOnce({ ...mockYear, isActive: false });
    prisma.schoolClass.count.mockResolvedValueOnce(0);
    prisma.teachingReduction.count.mockResolvedValueOnce(0);

    await service.remove('year-1');

    expect(prisma.schoolClass.count).toHaveBeenCalledWith({ where: { schoolYearId: 'year-1' } });
    expect(prisma.teachingReduction.count).toHaveBeenCalledWith({
      where: { schoolYearId: 'year-1' },
    });
    // Service must NOT call count on other models
    // (TimetableRun has no schoolYearId; ClassBookEntry has no schoolYearId)
    // No assertions needed beyond the two required calls above — other counts are not in the mock
  });
});
