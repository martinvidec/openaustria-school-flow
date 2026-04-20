import { Test, TestingModule } from '@nestjs/testing';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';

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
