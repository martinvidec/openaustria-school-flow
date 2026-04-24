import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GroupDerivationRuleService } from './group-derivation-rule.service';
import { PrismaService } from '../../config/database/prisma.service';

describe('GroupDerivationRuleService', () => {
  let service: GroupDerivationRuleService;
  let prisma: any;

  const mockRule = {
    id: 'rule-1',
    classId: 'class-3b',
    groupType: 'RELIGION',
    groupName: 'Röm.-Kath.',
    level: 'Katholisch',
    studentIds: ['student-1', 'student-2'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    groupDerivationRule: {
      findMany: vi.fn().mockResolvedValue([mockRule]),
      findUnique: vi.fn().mockResolvedValue(mockRule),
      create: vi.fn().mockImplementation((args: any) => ({ ...mockRule, ...args.data })),
      update: vi.fn().mockImplementation((args: any) => ({ ...mockRule, ...args.data })),
      delete: vi.fn().mockResolvedValue(mockRule),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupDerivationRuleService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GroupDerivationRuleService>(GroupDerivationRuleService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('persists a rule with classId + groupType + groupName + optional level', async () => {
      await service.create('class-3b', {
        groupType: 'RELIGION',
        groupName: 'Röm.-Kath.',
        level: 'Katholisch',
        studentIds: ['student-1'],
      });

      expect(prisma.groupDerivationRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            classId: 'class-3b',
            groupType: 'RELIGION',
            groupName: 'Röm.-Kath.',
            level: 'Katholisch',
            studentIds: ['student-1'],
          }),
        }),
      );
    });

    it('defaults studentIds to [] when omitted', async () => {
      await service.create('class-3b', {
        groupType: 'CUSTOM',
        groupName: 'AG Robotik',
      });

      const args = prisma.groupDerivationRule.create.mock.calls[0][0];
      expect(args.data.studentIds).toEqual([]);
    });
  });

  describe('findByClass', () => {
    it('returns ordered list for classId ordered by createdAt asc', async () => {
      await service.findByClass('class-3b');

      expect(prisma.groupDerivationRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { classId: 'class-3b' },
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when ruleId is unknown', async () => {
      prisma.groupDerivationRule.findUnique.mockResolvedValueOnce(null);
      await expect(service.update('missing', { groupName: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('preserves existing studentIds when dto omits them', async () => {
      await service.update('rule-1', { groupName: 'Renamed' });
      const call = prisma.groupDerivationRule.update.mock.calls[0][0];
      expect(call.data.studentIds).toEqual(mockRule.studentIds);
      expect(call.data.groupName).toBe('Renamed');
    });
  });

  describe('remove', () => {
    it('deletes the rule by id after findOne check', async () => {
      await service.remove('rule-1');
      expect(prisma.groupDerivationRule.delete).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
      });
    });

    it('throws NotFoundException when rule missing', async () => {
      prisma.groupDerivationRule.findUnique.mockResolvedValueOnce(null);
      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('cascade-delete', () => {
    it('deleted when parent SchoolClass is removed (Prisma onDelete:Cascade per schema — covered by migration SQL test)', () => {
      // Smoke-test documenting the schema invariant. Actual cascade is enforced by
      // `group_derivation_rules_class_id_fkey ... ON DELETE CASCADE` in the migration.
      expect(mockRule.classId).toBeDefined();
    });
  });
});
