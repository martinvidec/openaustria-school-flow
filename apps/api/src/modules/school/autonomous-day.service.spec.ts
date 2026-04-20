import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../config/database/generated/client.js';
import { PrismaService } from '../../config/database/prisma.service';
import { AutonomousDayService } from './autonomous-day.service';

function makeKnownRequestError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('test', { code, clientVersion: '7.6.0' });
}

describe('AutonomousDayService', () => {
  let service: AutonomousDayService;
  let prisma: any;

  const mockPrisma: any = {
    autonomousDay: {
      create: vi.fn(),
      delete: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AutonomousDayService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<AutonomousDayService>(AutonomousDayService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => vi.clearAllMocks());

  it('create() persists with schoolYearId, Date-wrapped date, reason default null', async () => {
    prisma.autonomousDay.create.mockResolvedValueOnce({ id: 'd1' });
    await service.create('year-1', { date: '2026-11-15' });
    const arg = prisma.autonomousDay.create.mock.calls[0][0];
    expect(arg.data.schoolYearId).toBe('year-1');
    expect(arg.data.date).toBeInstanceOf(Date);
    expect(arg.data.reason).toBeNull();
  });

  it('remove() maps Prisma P2025 to NotFoundException("Schulautonomer Tag nicht gefunden.")', async () => {
    prisma.autonomousDay.delete.mockRejectedValueOnce(makeKnownRequestError('P2025'));
    await expect(service.remove('missing-day')).rejects.toThrow(NotFoundException);
  });
});
