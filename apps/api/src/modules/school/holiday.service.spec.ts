import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../config/database/generated/client.js';
import { PrismaService } from '../../config/database/prisma.service';
import { HolidayService } from './holiday.service';

function makeKnownRequestError(code: string) {
  const err = new Prisma.PrismaClientKnownRequestError('test', { code, clientVersion: '7.6.0' });
  return err;
}

describe('HolidayService', () => {
  let service: HolidayService;
  let prisma: any;

  const mockPrisma: any = {
    holiday: {
      create: vi.fn(),
      delete: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HolidayService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<HolidayService>(HolidayService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => vi.clearAllMocks());

  it('create() persists with schoolYearId + Date-wrapped dates', async () => {
    prisma.holiday.create.mockResolvedValueOnce({ id: 'h1' });
    await service.create('year-1', {
      name: 'Herbstferien',
      startDate: '2026-10-26',
      endDate: '2026-11-02',
    });
    const arg = prisma.holiday.create.mock.calls[0][0];
    expect(arg.data.schoolYearId).toBe('year-1');
    expect(arg.data.name).toBe('Herbstferien');
    expect(arg.data.startDate).toBeInstanceOf(Date);
    expect(arg.data.endDate).toBeInstanceOf(Date);
  });

  it('create() maps Prisma P2003 foreign-key violation to NotFoundException("Schuljahr nicht gefunden.")', async () => {
    prisma.holiday.create.mockRejectedValueOnce(makeKnownRequestError('P2003'));
    await expect(
      service.create('missing', { name: 'x', startDate: '2026-10-26', endDate: '2026-11-02' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('remove() maps Prisma P2025 to NotFoundException("Ferieneintrag nicht gefunden.")', async () => {
    prisma.holiday.delete.mockRejectedValueOnce(makeKnownRequestError('P2025'));
    await expect(service.remove('missing-holiday')).rejects.toThrow(NotFoundException);
  });
});
