import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserDirectoryService } from './user-directory.service';
import { PrismaService } from '../../config/database/prisma.service';
import { KeycloakAdminService } from '../keycloak-admin/keycloak-admin.service';
import { TeacherService } from '../teacher/teacher.service';
import { StudentService } from '../student/student.service';
import { ParentService } from '../parent/parent.service';

const mockPrisma = {
  userRole: {
    findMany: vi.fn(),
  },
  person: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  teacher: {
    findUnique: vi.fn(),
  },
  student: {
    findUnique: vi.fn(),
  },
  parent: {
    findUnique: vi.fn(),
  },
};

const mockKc = {
  findUsers: vi.fn(),
  countUsers: vi.fn(),
  findUserById: vi.fn(),
  setEnabled: vi.fn(),
};

const mockTeacher = {
  linkKeycloakUser: vi.fn(),
  unlinkKeycloakUser: vi.fn(),
};
const mockStudent = {
  linkKeycloakUser: vi.fn(),
  unlinkKeycloakUser: vi.fn(),
};
const mockParent = {
  linkKeycloakUser: vi.fn(),
  unlinkKeycloakUser: vi.fn(),
};

describe('UserDirectoryService', () => {
  let service: UserDirectoryService;

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserDirectoryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: KeycloakAdminService, useValue: mockKc },
        { provide: TeacherService, useValue: mockTeacher },
        { provide: StudentService, useValue: mockStudent },
        { provide: ParentService, useValue: mockParent },
      ],
    }).compile();
    service = module.get<UserDirectoryService>(UserDirectoryService);
  });

  describe('findAll', () => {
    it('merges KC users with prisma roles + person link (hybrid hydration)', async () => {
      mockKc.findUsers.mockResolvedValue([
        {
          id: 'kc-1',
          email: 'a@b.c',
          firstName: 'Anna',
          lastName: 'Müller',
          username: 'anna',
          enabled: true,
          createdTimestamp: 1700000000000,
        },
      ]);
      mockKc.countUsers.mockResolvedValue(1);
      mockPrisma.userRole.findMany.mockResolvedValue([
        { userId: 'kc-1', role: { name: 'lehrer' } },
      ]);
      mockPrisma.person.findMany.mockResolvedValue([
        { id: 'p1', keycloakUserId: 'kc-1', personType: 'TEACHER', firstName: 'Anna', lastName: 'Müller' },
      ]);

      const result = await service.findAll({
        page: 1,
        limit: 25,
        first: 0,
        linked: 'all',
        enabled: 'all',
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 'kc-1',
        roles: ['lehrer'],
        personLink: expect.objectContaining({ id: 'p1' }),
      });
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalIsApproximate).toBe(false);
    });

    it('marks totalIsApproximate=true when post-filter (linked) narrows results', async () => {
      mockKc.findUsers.mockResolvedValue([
        { id: 'kc-1', email: 'linked@x', firstName: 'L', lastName: 'X', enabled: true },
        { id: 'kc-2', email: 'unlinked@x', firstName: 'U', lastName: 'X', enabled: true },
      ]);
      mockKc.countUsers.mockResolvedValue(2);
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockPrisma.person.findMany.mockResolvedValue([
        { id: 'p1', keycloakUserId: 'kc-1', personType: 'TEACHER', firstName: 'L', lastName: 'X' },
      ]);

      const result = await service.findAll({
        page: 1,
        limit: 25,
        first: 0,
        linked: 'linked',
        enabled: 'all',
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('kc-1');
      expect(result.meta.totalIsApproximate).toBe(true);
    });

    it('post-filters by enabled=disabled', async () => {
      mockKc.findUsers.mockResolvedValue([
        { id: 'kc-1', email: 'a@x', firstName: 'A', lastName: 'X', enabled: true },
        { id: 'kc-2', email: 'b@x', firstName: 'B', lastName: 'X', enabled: false },
      ]);
      mockKc.countUsers.mockResolvedValue(2);
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockPrisma.person.findMany.mockResolvedValue([]);

      const result = await service.findAll({
        page: 1,
        limit: 25,
        first: 0,
        linked: 'all',
        enabled: 'disabled',
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('kc-2');
      expect(result.meta.totalIsApproximate).toBe(true);
    });

    it('post-filters by role membership', async () => {
      mockKc.findUsers.mockResolvedValue([
        { id: 'kc-1', email: 'a@x', firstName: 'A', lastName: 'X', enabled: true },
        { id: 'kc-2', email: 'b@x', firstName: 'B', lastName: 'X', enabled: true },
      ]);
      mockKc.countUsers.mockResolvedValue(2);
      mockPrisma.userRole.findMany.mockResolvedValue([
        { userId: 'kc-1', role: { name: 'admin' } },
        { userId: 'kc-2', role: { name: 'lehrer' } },
      ]);
      mockPrisma.person.findMany.mockResolvedValue([]);

      const result = await service.findAll({
        page: 1,
        limit: 25,
        first: 0,
        linked: 'all',
        enabled: 'all',
        role: ['admin'],
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('kc-1');
      expect(result.meta.totalIsApproximate).toBe(true);
    });
  });

  describe('findOne', () => {
    it('returns hybrid KC + roles + personLink shape', async () => {
      mockKc.findUserById.mockResolvedValue({
        id: 'kc-1',
        email: 'a@b',
        firstName: 'A',
        lastName: 'B',
        username: 'a',
        enabled: true,
      });
      mockPrisma.userRole.findMany.mockResolvedValue([
        { userId: 'kc-1', role: { name: 'admin' } },
      ]);
      mockPrisma.person.findUnique.mockResolvedValue({
        id: 'p1',
        keycloakUserId: 'kc-1',
        personType: 'TEACHER',
        firstName: 'A',
        lastName: 'B',
      });

      const result = await service.findOne('kc-1');
      expect(result.id).toBe('kc-1');
      expect(result.roles).toEqual(['admin']);
      expect(result.personLink).toMatchObject({ id: 'p1' });
    });

    it('throws NotFoundException when KC returns undefined', async () => {
      mockKc.findUserById.mockResolvedValue(undefined);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('linkPerson', () => {
    it('happy path — TEACHER personType dispatches to teacherService.linkKeycloakUser', async () => {
      mockPrisma.person.findUnique
        .mockResolvedValueOnce(null) // user-side pre-check: no existing link
        .mockResolvedValueOnce({
          id: 'p1',
          keycloakUserId: null,
          personType: 'TEACHER',
          firstName: 'Anna',
          lastName: 'Müller',
        });
      mockPrisma.teacher.findUnique.mockResolvedValue({ personId: 'p1' });
      mockTeacher.linkKeycloakUser.mockResolvedValue({ id: 'p1' });

      const result = await service.linkPerson('kc-1', { personType: 'TEACHER', personId: 't1' });
      expect(mockTeacher.linkKeycloakUser).toHaveBeenCalledWith('t1', 'kc-1');
      expect(result.person).toEqual({ id: 'p1' });
    });

    it('throws 409 when user is already linked to a different Person (user-side pre-check)', async () => {
      mockPrisma.person.findUnique.mockResolvedValueOnce({
        id: 'p-other',
        keycloakUserId: 'kc-1',
        personType: 'TEACHER',
        firstName: 'Other',
        lastName: 'One',
      });

      await expect(
        service.linkPerson('kc-1', { personType: 'TEACHER', personId: 't1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws 409 when target Person is already linked to a different keycloakUserId (person-side pre-check, prevents silent link-theft)', async () => {
      mockPrisma.person.findUnique
        .mockResolvedValueOnce(null) // user has no link
        .mockResolvedValueOnce({
          id: 't1',
          keycloakUserId: 'kc-OTHER',
          personType: 'TEACHER',
          firstName: 'Maria',
          lastName: 'Huber',
        });
      mockPrisma.teacher.findUnique.mockResolvedValue({ personId: 't1' });
      mockKc.findUserById.mockResolvedValue({
        id: 'kc-OTHER',
        email: 'maria@x',
        username: 'maria',
      });

      try {
        await service.linkPerson('kc-1', { personType: 'TEACHER', personId: 't1' });
        expect.fail('expected ConflictException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ConflictException);
        const body = e.getResponse();
        expect(body.type).toBe('schoolflow://errors/person-link-conflict');
        expect(body.affectedEntities[0].kind).toBe('user');
        expect(body.affectedEntities[0].id).toBe('kc-OTHER');
      }
    });

    it('translates Prisma P2002 to 409 (defensive race-condition fallback)', async () => {
      mockPrisma.person.findUnique
        .mockResolvedValueOnce(null) // user has no link
        .mockResolvedValueOnce({
          id: 't1',
          keycloakUserId: null,
          personType: 'TEACHER',
          firstName: 'Maria',
          lastName: 'Huber',
        })
        .mockResolvedValueOnce({
          id: 't1',
          keycloakUserId: 'kc-RACE-WINNER',
          personType: 'TEACHER',
          firstName: 'Maria',
          lastName: 'Huber',
        });
      mockPrisma.teacher.findUnique.mockResolvedValue({ personId: 't1' });
      mockTeacher.linkKeycloakUser.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.linkPerson('kc-1', { personType: 'TEACHER', personId: 't1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('STUDENT personType dispatches to studentService.linkKeycloakUser', async () => {
      mockPrisma.person.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 's1',
          keycloakUserId: null,
          personType: 'STUDENT',
          firstName: 'S',
          lastName: 'T',
        });
      mockPrisma.student.findUnique.mockResolvedValue({ personId: 's1' });
      mockStudent.linkKeycloakUser.mockResolvedValue({ id: 's1' });

      await service.linkPerson('kc-2', { personType: 'STUDENT', personId: 's1' });
      expect(mockStudent.linkKeycloakUser).toHaveBeenCalledWith('s1', 'kc-2');
    });

    it('PARENT personType dispatches to parentService.linkKeycloakUser', async () => {
      mockPrisma.person.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'p1',
          keycloakUserId: null,
          personType: 'PARENT',
          firstName: 'P',
          lastName: 'A',
        });
      mockPrisma.parent.findUnique.mockResolvedValue({ personId: 'p1' });
      mockParent.linkKeycloakUser.mockResolvedValue({ id: 'p1' });

      await service.linkPerson('kc-3', { personType: 'PARENT', personId: 'p1' });
      expect(mockParent.linkKeycloakUser).toHaveBeenCalledWith('p1', 'kc-3');
    });
  });

  describe('unlinkPerson', () => {
    it('returns silently when no link exists (idempotent no-op)', async () => {
      mockPrisma.person.findUnique.mockResolvedValue(null);
      await expect(service.unlinkPerson('kc-1')).resolves.toBeUndefined();
      expect(mockTeacher.unlinkKeycloakUser).not.toHaveBeenCalled();
      expect(mockStudent.unlinkKeycloakUser).not.toHaveBeenCalled();
      expect(mockParent.unlinkKeycloakUser).not.toHaveBeenCalled();
    });

    it('dispatches teacher unlink for TEACHER personType', async () => {
      mockPrisma.person.findUnique.mockResolvedValue({
        id: 'p1',
        keycloakUserId: 'kc-1',
        personType: 'TEACHER',
        teacher: { id: 't1' },
        student: null,
        parent: null,
      });
      await service.unlinkPerson('kc-1');
      expect(mockTeacher.unlinkKeycloakUser).toHaveBeenCalledWith('t1');
    });
  });
});
