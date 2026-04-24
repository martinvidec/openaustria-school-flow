import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PermissionOverrideService } from './permission-override.service';
import { PrismaService } from '../../config/database/prisma.service';

const mockPrisma = {
  permissionOverride: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
};

describe('PermissionOverrideService', () => {
  let service: PermissionOverrideService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionOverrideService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<PermissionOverrideService>(PermissionOverrideService);
  });

  it('create — happy path inserts row with grantedBy from caller', async () => {
    mockPrisma.permissionOverride.create.mockResolvedValue({ id: 'o1' });
    const dto = {
      userId: 'u1',
      action: 'read',
      subject: 'student',
      granted: true,
      conditions: null,
      reason: 'r',
    };
    const result = await service.create(dto, 'admin-kc');
    expect(mockPrisma.permissionOverride.create).toHaveBeenCalledWith({
      data: { ...dto, grantedBy: 'admin-kc' },
    });
    expect(result).toEqual({ id: 'o1' });
  });

  it('create — translates Prisma P2002 to 409 schoolflow://errors/override-duplicate', async () => {
    mockPrisma.permissionOverride.create.mockRejectedValue({ code: 'P2002' });
    try {
      await service.create(
        {
          userId: 'u1',
          action: 'read',
          subject: 'student',
          granted: true,
          conditions: null,
          reason: 'r',
        },
        'admin-kc',
      );
      expect.fail('expected ConflictException');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ConflictException);
      expect(e.getResponse().type).toBe('schoolflow://errors/override-duplicate');
    }
  });

  it('update — happy path updates row', async () => {
    mockPrisma.permissionOverride.findUnique.mockResolvedValue({ id: 'o1' });
    mockPrisma.permissionOverride.update.mockResolvedValue({ id: 'o1' });
    await service.update('o1', { reason: 'new reason' });
    expect(mockPrisma.permissionOverride.update).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { reason: 'new reason' },
    });
  });

  it('update — throws NotFoundException when row does not exist', async () => {
    mockPrisma.permissionOverride.findUnique.mockResolvedValue(null);
    await expect(
      service.update('missing', { reason: 'r' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('delete — happy path removes row', async () => {
    mockPrisma.permissionOverride.findUnique.mockResolvedValue({ id: 'o1' });
    mockPrisma.permissionOverride.delete.mockResolvedValue({ id: 'o1' });
    await service.delete('o1');
    expect(mockPrisma.permissionOverride.delete).toHaveBeenCalledWith({
      where: { id: 'o1' },
    });
  });

  it('delete — throws NotFoundException when row does not exist', async () => {
    mockPrisma.permissionOverride.findUnique.mockResolvedValue(null);
    await expect(service.delete('missing')).rejects.toThrow(NotFoundException);
  });

  it('findAllForUser — returns rows sorted desc by createdAt', async () => {
    mockPrisma.permissionOverride.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const result = await service.findAllForUser('u1');
    expect(mockPrisma.permissionOverride.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([{ id: 'a' }, { id: 'b' }]);
  });
});
