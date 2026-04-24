import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { RoleManagementService } from './role-management.service';
import { PrismaService } from '../../config/database/prisma.service';
import { KeycloakAdminService } from '../keycloak-admin/keycloak-admin.service';

const mockPrisma = {
  role: {
    findMany: vi.fn(),
  },
  userRole: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn(async (cb: any, opts: any) => {
    void opts;
    if (typeof cb === 'function') return cb(mockPrisma);
    return cb;
  }),
};

const mockKc = {
  listRealmRoleMappings: vi.fn(),
  addRealmRoleMappings: vi.fn(),
  delRealmRoleMappings: vi.fn(),
  findRealmRoleByName: vi.fn(),
};

describe('RoleManagementService', () => {
  let service: RoleManagementService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleManagementService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: KeycloakAdminService, useValue: mockKc },
      ],
    }).compile();
    service = module.get<RoleManagementService>(RoleManagementService);
  });

  describe('listAllRoles', () => {
    it('returns all roles ordered by name asc', async () => {
      mockPrisma.role.findMany.mockResolvedValue([
        { id: 'r1', name: 'admin', displayName: 'Administrator', description: null },
        { id: 'r2', name: 'lehrer', displayName: 'Lehrer', description: null },
      ]);
      const result = await service.listAllRoles();
      expect(result).toHaveLength(2);
      expect(mockPrisma.role.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('listUserRoles', () => {
    it('returns the role names for a user', async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([
        { role: { name: 'admin' } },
        { role: { name: 'schulleitung' } },
      ]);
      const result = await service.listUserRoles('kc-1');
      expect(result.roles).toEqual(['admin', 'schulleitung']);
    });
  });

  describe('updateUserRoles — LOCK-01 mirror-write semantics', () => {
    it('happy: assigning admin to user-A deletes existing UserRole then creates one + mirrors to KC', async () => {
      // Validate roleNames exist
      mockPrisma.role.findMany.mockResolvedValueOnce([
        { id: 'r1', name: 'admin' },
      ]);
      mockPrisma.userRole.deleteMany.mockResolvedValueOnce({ count: 0 });
      mockPrisma.userRole.createMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.userRole.count.mockResolvedValueOnce(2); // global admin count
      // KC mirror
      mockKc.listRealmRoleMappings.mockResolvedValue([]);
      mockKc.findRealmRoleByName.mockResolvedValue({ id: 'kr1', name: 'admin' });

      await service.updateUserRoles('kc-A', { roleNames: ['admin'] });

      expect(mockPrisma.userRole.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'kc-A' },
      });
      expect(mockPrisma.userRole.createMany).toHaveBeenCalled();
      expect(mockKc.addRealmRoleMappings).toHaveBeenCalledWith('kc-A', [
        { id: 'kr1', name: 'admin' },
      ]);
      // Nothing to delete (user had no KC roles)
      expect(mockKc.delRealmRoleMappings).not.toHaveBeenCalled();
    });

    it('happy: swap admin → lehrer fires both add(lehrer) AND del(admin) KC mirror calls', async () => {
      mockPrisma.role.findMany.mockResolvedValueOnce([
        { id: 'r2', name: 'lehrer' },
      ]);
      mockPrisma.userRole.deleteMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.userRole.createMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.userRole.count.mockResolvedValueOnce(5); // plenty of admins
      // KC user currently has admin only
      mockKc.listRealmRoleMappings.mockResolvedValue([
        { id: 'kr1', name: 'admin' },
      ]);
      mockKc.findRealmRoleByName.mockImplementation(async (name: string) => {
        if (name === 'lehrer') return { id: 'kr2', name: 'lehrer' };
        if (name === 'admin') return { id: 'kr1', name: 'admin' };
        return undefined;
      });

      await service.updateUserRoles('kc-A', { roleNames: ['lehrer'] });

      expect(mockKc.addRealmRoleMappings).toHaveBeenCalledWith('kc-A', [
        { id: 'kr2', name: 'lehrer' },
      ]);
      expect(mockKc.delRealmRoleMappings).toHaveBeenCalledWith('kc-A', [
        { id: 'kr1', name: 'admin' },
      ]);
    });

    it('rejects unknown role names with BadRequestException (transaction rolls back, KC NOT called)', async () => {
      // Validate returns fewer rows than asked → mismatch → 400
      mockPrisma.role.findMany.mockResolvedValueOnce([
        { id: 'r2', name: 'lehrer' },
      ]);
      await expect(
        service.updateUserRoles('kc-A', { roleNames: ['lehrer', 'unbekannt'] }),
      ).rejects.toThrow(BadRequestException);
      expect(mockKc.addRealmRoleMappings).not.toHaveBeenCalled();
      expect(mockKc.delRealmRoleMappings).not.toHaveBeenCalled();
    });

    it('last-admin-guard / min-1-admin lockout protection: throws 409 with schoolflow://errors/last-admin-guard', async () => {
      // Empty role array attempt against the only admin user.
      mockPrisma.role.findMany.mockResolvedValueOnce([]);
      mockPrisma.userRole.deleteMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.userRole.createMany.mockResolvedValueOnce({ count: 0 });
      mockPrisma.userRole.count.mockResolvedValueOnce(0); // no admins left

      try {
        await service.updateUserRoles('kc-A', { roleNames: [] });
        expect.fail('expected ConflictException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ConflictException);
        const body = e.getResponse();
        expect(body.type).toBe('schoolflow://errors/last-admin-guard');
        expect(body.title).toMatch(/Admin/i);
      }
      // Verify mirror-write did NOT fire (transaction was rolled back)
      expect(mockKc.addRealmRoleMappings).not.toHaveBeenCalled();
      expect(mockKc.delRealmRoleMappings).not.toHaveBeenCalled();
    });

    it('uses isolationLevel: Serializable for the transaction (concurrent demote race protection)', async () => {
      mockPrisma.role.findMany.mockResolvedValueOnce([
        { id: 'r1', name: 'admin' },
      ]);
      mockPrisma.userRole.deleteMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.userRole.createMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.userRole.count.mockResolvedValueOnce(2);
      mockKc.listRealmRoleMappings.mockResolvedValue([]);
      mockKc.findRealmRoleByName.mockResolvedValue({ id: 'kr1', name: 'admin' });

      await service.updateUserRoles('kc-A', { roleNames: ['admin'] });
      // Inspect the second arg to $transaction (the options bag)
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ isolationLevel: 'Serializable' }),
      );
    });
  });
});
