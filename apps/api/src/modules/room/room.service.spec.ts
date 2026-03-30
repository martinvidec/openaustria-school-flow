import { Test, TestingModule } from '@nestjs/testing';
import { RoomService } from './room.service';
import { PrismaService } from '../../config/database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('RoomService', () => {
  let service: RoomService;
  let prismaService: any;

  const mockRoom = {
    id: 'room-1',
    schoolId: 'school-1',
    name: 'Raum 101',
    roomType: 'KLASSENZIMMER',
    capacity: 30,
    equipment: ['Beamer', 'Smartboard'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    room: {
      create: vi.fn().mockResolvedValue(mockRoom),
      findMany: vi.fn().mockResolvedValue([mockRoom]),
      findUnique: vi.fn().mockResolvedValue(mockRoom),
      update: vi.fn().mockResolvedValue(mockRoom),
      delete: vi.fn().mockResolvedValue(mockRoom),
      count: vi.fn().mockResolvedValue(1),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a room with schoolId and dto data', async () => {
      const dto = {
        name: 'Raum 101',
        roomType: 'KLASSENZIMMER' as any,
        capacity: 30,
        equipment: ['Beamer', 'Smartboard'],
      };

      const result = await service.create('school-1', dto);

      expect(result).toEqual(mockRoom);
      expect(prismaService.room.create).toHaveBeenCalledWith({
        data: {
          schoolId: 'school-1',
          name: 'Raum 101',
          roomType: 'KLASSENZIMMER',
          capacity: 30,
          equipment: ['Beamer', 'Smartboard'],
        },
      });
    });

    it('should default equipment to empty array when not provided', async () => {
      const dto = {
        name: 'Turnsaal',
        roomType: 'TURNSAAL' as any,
        capacity: 60,
      };

      await service.create('school-1', dto);

      const createArg = prismaService.room.create.mock.calls[0][0];
      expect(createArg.data.equipment).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should return paginated rooms for a school', async () => {
      const pagination = { page: 1, limit: 20, skip: 0 };

      const result = await service.findAll('school-1', pagination as any);

      expect(result.data).toEqual([mockRoom]);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(prismaService.room.findMany).toHaveBeenCalledWith({
        where: { schoolId: 'school-1' },
        skip: 0,
        take: 20,
        orderBy: { name: 'asc' },
      });
      expect(prismaService.room.count).toHaveBeenCalledWith({
        where: { schoolId: 'school-1' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a room by id', async () => {
      const result = await service.findOne('room-1');
      expect(result).toEqual(mockRoom);
      expect(prismaService.room.findUnique).toHaveBeenCalledWith({
        where: { id: 'room-1' },
      });
    });

    it('should throw NotFoundException when room not found', async () => {
      prismaService.room.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a room', async () => {
      const dto = { name: 'Raum 102', capacity: 25 };

      const result = await service.update('room-1', dto);

      expect(result).toEqual(mockRoom);
      expect(prismaService.room.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: {
          name: 'Raum 102',
          capacity: 25,
        },
      });
    });

    it('should throw NotFoundException when updating non-existent room', async () => {
      prismaService.room.findUnique.mockResolvedValueOnce(null);
      await expect(service.update('nonexistent', { name: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a room', async () => {
      await service.remove('room-1');
      expect(prismaService.room.delete).toHaveBeenCalledWith({
        where: { id: 'room-1' },
      });
    });

    it('should throw NotFoundException when deleting non-existent room', async () => {
      prismaService.room.findUnique.mockResolvedValueOnce(null);
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
