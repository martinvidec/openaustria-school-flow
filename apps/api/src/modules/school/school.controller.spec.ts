import { Test, TestingModule } from '@nestjs/testing';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SCHOOL_TYPES } from '@schoolflow/shared';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';
import { CreateSchoolDto } from './dto/create-school.dto';

describe('SchoolController', () => {
  let controller: SchoolController;
  let serviceMock: any;

  beforeEach(async () => {
    serviceMock = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      getTemplates: vi.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchoolController],
      providers: [{ provide: SchoolService, useValue: serviceMock }],
    }).compile();
    controller = module.get<SchoolController>(SchoolController);
  });

  afterEach(() => vi.clearAllMocks());

  it('PUT /schools/:id with {abWeekEnabled: true} forwards the flag to service.update', async () => {
    serviceMock.update.mockResolvedValueOnce({ id: 'school-1', abWeekEnabled: true });
    const result = await controller.update('school-1', { abWeekEnabled: true } as any);
    expect(serviceMock.update).toHaveBeenCalledWith('school-1', { abWeekEnabled: true });
    expect((result as any).abWeekEnabled).toBe(true);
  });

  it('PUT /schools/:id with {abWeekEnabled: false} forwards the flag to service.update', async () => {
    serviceMock.update.mockResolvedValueOnce({ id: 'school-1', abWeekEnabled: false });
    const result = await controller.update('school-1', { abWeekEnabled: false } as any);
    expect(serviceMock.update).toHaveBeenCalledWith('school-1', { abWeekEnabled: false });
    expect((result as any).abWeekEnabled).toBe(false);
  });
});

describe('CreateSchoolDto schoolType validation (Phase 10.1 Bug 1)', () => {
  it.each([...SCHOOL_TYPES])('accepts schoolType=%s', async (t) => {
    const dto = plainToInstance(CreateSchoolDto, { name: 'Test Schule', schoolType: t });
    const errors = await validate(dto);
    const schoolTypeErrors = errors.filter((e) => e.property === 'schoolType');
    expect(schoolTypeErrors).toEqual([]);
  });

  it('rejects unknown schoolType', async () => {
    const dto = plainToInstance(CreateSchoolDto, { name: 'Test Schule', schoolType: 'BOGUS_TYPE' });
    const errors = await validate(dto);
    const schoolTypeErrors = errors.filter((e) => e.property === 'schoolType');
    expect(schoolTypeErrors.length).toBeGreaterThan(0);
    expect(JSON.stringify(schoolTypeErrors[0].constraints)).toMatch(/isEnum/i);
  });

  it('rejects legacy Phase-2 schoolType "MS" (new schools must use active values)', async () => {
    const dto = plainToInstance(CreateSchoolDto, { name: 'Test Schule', schoolType: 'MS' });
    const errors = await validate(dto);
    const schoolTypeErrors = errors.filter((e) => e.property === 'schoolType');
    expect(schoolTypeErrors.length).toBeGreaterThan(0);
  });
});
