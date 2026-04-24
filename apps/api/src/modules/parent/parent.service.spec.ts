import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ParentService } from './parent.service';
import { PrismaService } from '../../config/database/prisma.service';

describe('ParentService', () => {
  let service: ParentService;
  let prisma: any;

  const mockPerson = {
    id: 'person-p1',
    schoolId: 'school-1',
    personType: 'PARENT',
    firstName: 'Erika',
    lastName: 'Mustermann',
    email: 'erika@example.at',
    phone: null,
    parent: { id: 'parent-1', personId: 'person-p1', schoolId: 'school-1' },
  };

  const mockParent = {
    id: 'parent-1',
    personId: 'person-p1',
    schoolId: 'school-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    person: {
      id: 'person-p1',
      firstName: 'Erika',
      lastName: 'Mustermann',
      email: 'erika@example.at',
      phone: null,
    },
    children: [],
    _count: { children: 0 },
  };

  const mockPrismaService = {
    person: {
      create: vi.fn().mockResolvedValue(mockPerson),
      update: vi.fn().mockResolvedValue(mockPerson),
      delete: vi.fn().mockResolvedValue(mockPerson),
    },
    parent: {
      findMany: vi.fn().mockResolvedValue([mockParent]),
      findUnique: vi.fn().mockResolvedValue(mockParent),
      count: vi.fn().mockResolvedValue(1),
    },
    parentStudent: {
      count: vi.fn().mockResolvedValue(0),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ParentService>(ParentService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockPrismaService.parentStudent.count.mockResolvedValue(0);
    mockPrismaService.parent.findUnique.mockResolvedValue(mockParent);
  });

  describe('create', () => {
    it('nested-creates Person with personType=PARENT then Parent row in single tx', async () => {
      await service.create({
        schoolId: 'school-1',
        firstName: 'Erika',
        lastName: 'Mustermann',
        email: 'erika@example.at',
      });

      expect(prisma.person.create).toHaveBeenCalledTimes(1);
      const arg = prisma.person.create.mock.calls[0][0];
      expect(arg.data.personType).toBe('PARENT');
      expect(arg.data.firstName).toBe('Erika');
      expect(arg.data.parent.create.schoolId).toBe('school-1');
    });

    it('returns parent with nested person', async () => {
      const result = await service.create({
        schoolId: 'school-1',
        firstName: 'Erika',
        lastName: 'Mustermann',
        email: 'erika@example.at',
      });
      expect(result).toEqual(mockPerson);
    });
  });

  describe('findAll', () => {
    it('filters by schoolId (required)', async () => {
      await expect(
        service.findAll({ schoolId: undefined } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('filters by email substring (case-insensitive)', async () => {
      await service.findAll({ schoolId: 'school-1', email: 'musterm', page: 1, limit: 20 } as any);
      const whereArg = prisma.parent.findMany.mock.calls[0][0].where;
      expect(whereArg.person.email).toEqual({ contains: 'musterm', mode: 'insensitive' });
    });

    it('filters by name substring (firstName OR lastName)', async () => {
      await service.findAll({ schoolId: 'school-1', name: 'huber', page: 1, limit: 20 } as any);
      const whereArg = prisma.parent.findMany.mock.calls[0][0].where;
      expect(whereArg.person.OR).toBeDefined();
      expect(whereArg.person.OR).toHaveLength(2);
    });

    it('returns paginated response with meta', async () => {
      const result = await service.findAll({ schoolId: 'school-1', page: 1, limit: 20 } as any);
      expect(result.data).toEqual([mockParent]);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('returns parent with nested person + children count', async () => {
      const result = await service.findOne('parent-1');
      expect(result).toEqual(mockParent);
      expect(prisma.parent.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'parent-1' },
          include: expect.objectContaining({ person: true }),
        }),
      );
    });

    it('throws NotFoundException when id not found', async () => {
      prisma.parent.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates Person fields (firstName/lastName/email/phone) via nested update', async () => {
      await service.update('parent-1', {
        firstName: 'Neu',
        lastName: 'Name',
      } as any);
      expect(prisma.person.update).toHaveBeenCalledWith({
        where: { id: 'person-p1' },
        data: { firstName: 'Neu', lastName: 'Name' },
      });
    });
  });

  describe('remove — Orphan-Guard', () => {
    it('deletes person (cascading parent) when zero ParentStudent refs', async () => {
      await service.remove('parent-1');
      expect(prisma.person.delete).toHaveBeenCalledWith({ where: { id: 'person-p1' } });
    });

    it('throws ConflictException with affectedEntities.linkedStudents when ParentStudent refs exist', async () => {
      mockPrismaService.parentStudent.count.mockResolvedValueOnce(3);
      const err = (await service.remove('parent-1').catch((e) => e)) as ConflictException;
      expect(err).toBeInstanceOf(ConflictException);
      const response = err.getResponse() as any;
      expect(response.extensions.affectedEntities.linkedStudents).toBe(3);
      expect(prisma.person.delete).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Phase 13-01 Task 3 (USER-05) — Keycloak link mirror of teacher.service
  // ---------------------------------------------------------------------------

  describe('linkKeycloakUser / unlinkKeycloakUser', () => {
    it('linkKeycloakUser sets Person.keycloakUserId for the parent', async () => {
      mockPrismaService.parent.findUnique.mockResolvedValueOnce({
        id: 'parent-1',
        personId: 'person-p1',
        person: { id: 'person-p1' },
      });
      await service.linkKeycloakUser('parent-1', 'kc-user-1');
      expect(prisma.person.update).toHaveBeenCalledWith({
        where: { id: 'person-p1' },
        data: { keycloakUserId: 'kc-user-1' },
      });
    });

    it('linkKeycloakUser throws NotFoundException when parent missing', async () => {
      mockPrismaService.parent.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.linkKeycloakUser('nope', 'kc-user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('unlinkKeycloakUser clears Person.keycloakUserId for the parent', async () => {
      mockPrismaService.parent.findUnique.mockResolvedValueOnce({
        id: 'parent-1',
        personId: 'person-p1',
        person: { id: 'person-p1' },
      });
      await service.unlinkKeycloakUser('parent-1');
      expect(prisma.person.update).toHaveBeenCalledWith({
        where: { id: 'person-p1' },
        data: { keycloakUserId: null },
      });
    });

    it('unlinkKeycloakUser throws NotFoundException when parent missing', async () => {
      mockPrismaService.parent.findUnique.mockResolvedValueOnce(null);
      await expect(service.unlinkKeycloakUser('nope')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
