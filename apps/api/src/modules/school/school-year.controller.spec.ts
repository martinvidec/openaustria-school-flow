import { Test, TestingModule } from '@nestjs/testing';
import { SchoolYearController } from './school-year.controller';
import { SchoolYearService } from './school-year.service';
import { CHECK_PERMISSIONS_KEY } from '../auth/decorators/check-permissions.decorator';

describe('SchoolYearController', () => {
  let controller: SchoolYearController;
  let serviceMock: any;

  beforeEach(async () => {
    serviceMock = {
      create: vi.fn().mockResolvedValue({ id: 'year-1' }),
      findAll: vi.fn().mockResolvedValue([{ id: 'year-1' }]),
      update: vi.fn().mockResolvedValue({ id: 'year-1' }),
      activate: vi.fn().mockResolvedValue({ id: 'year-1', isActive: true }),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchoolYearController],
      providers: [{ provide: SchoolYearService, useValue: serviceMock }],
    }).compile();

    controller = module.get<SchoolYearController>(SchoolYearController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('POST delegates to service.create with schoolId and body', async () => {
    await controller.create('school-1', { name: '2026/2027' } as any);
    expect(serviceMock.create).toHaveBeenCalledWith('school-1', { name: '2026/2027' });
  });

  it('GET delegates to service.findAll with schoolId', async () => {
    await controller.findAll('school-1');
    expect(serviceMock.findAll).toHaveBeenCalledWith('school-1');
  });

  it('PATCH delegates to service.update with yearId and body', async () => {
    await controller.update('school-1', 'year-1', { name: 'renamed' } as any);
    expect(serviceMock.update).toHaveBeenCalledWith('year-1', { name: 'renamed' });
  });

  it('POST :yearId/activate delegates to service.activate with schoolId + yearId', async () => {
    await controller.activate('school-1', 'year-1');
    expect(serviceMock.activate).toHaveBeenCalledWith('school-1', 'year-1');
  });

  it('DELETE :yearId delegates to service.remove with yearId', async () => {
    await controller.remove('school-1', 'year-1');
    expect(serviceMock.remove).toHaveBeenCalledWith('year-1');
  });

  it('each endpoint carries the @CheckPermissions decorator with subject="school-year"', () => {
    const proto = SchoolYearController.prototype as any;

    const createPerms = Reflect.getMetadata(CHECK_PERMISSIONS_KEY, proto.create);
    expect(createPerms).toEqual([{ action: 'create', subject: 'school-year' }]);

    const findAllPerms = Reflect.getMetadata(CHECK_PERMISSIONS_KEY, proto.findAll);
    expect(findAllPerms).toEqual([{ action: 'read', subject: 'school-year' }]);

    const updatePerms = Reflect.getMetadata(CHECK_PERMISSIONS_KEY, proto.update);
    expect(updatePerms).toEqual([{ action: 'update', subject: 'school-year' }]);

    const activatePerms = Reflect.getMetadata(CHECK_PERMISSIONS_KEY, proto.activate);
    expect(activatePerms).toEqual([{ action: 'activate', subject: 'school-year' }]);

    const removePerms = Reflect.getMetadata(CHECK_PERMISSIONS_KEY, proto.remove);
    expect(removePerms).toEqual([{ action: 'delete', subject: 'school-year' }]);
  });
});
