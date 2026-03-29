import { Test, TestingModule } from '@nestjs/testing';
import { GroupMembershipRuleService, GroupAutoAssignRule } from './group-membership-rule.service';
import { GroupService } from './group.service';
import { PrismaService } from '../../config/database/prisma.service';

describe('GroupMembershipRuleService', () => {
  let ruleService: GroupMembershipRuleService;
  let groupService: GroupService;
  let prisma: any;

  const mockStudents = [
    {
      id: 'student-1',
      personId: 'person-1',
      classId: 'class-3b',
      person: { firstName: 'Maria', lastName: 'Huber' },
    },
    {
      id: 'student-2',
      personId: 'person-2',
      classId: 'class-3b',
      person: { firstName: 'Max', lastName: 'Mueller' },
    },
    {
      id: 'student-3',
      personId: 'person-3',
      classId: 'class-3b',
      person: { firstName: 'Anna', lastName: 'Schmidt' },
    },
  ];

  const mockPrismaService = {
    student: {
      findMany: vi.fn().mockResolvedValue(mockStudents),
    },
    group: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args: any) => ({
        id: `group-${args.data.name}`,
        ...args.data,
        memberships: [],
      })),
    },
    groupMembership: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args: any) => ({
        id: `membership-${Date.now()}`,
        ...args.data,
        assignedAt: new Date(),
      })),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };

  const mockGroupService = {
    create: vi.fn().mockImplementation((dto: any) => ({
      id: `group-${dto.name}`,
      ...dto,
      memberships: [],
    })),
    addMember: vi.fn().mockResolvedValue({
      id: 'membership-1',
      isAutoAssigned: false,
    }),
    removeMember: vi.fn().mockResolvedValue(undefined),
    findByClass: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue({
      id: 'group-1',
      name: 'Test Group',
      memberships: [],
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupMembershipRuleService,
        GroupService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    ruleService = module.get<GroupMembershipRuleService>(GroupMembershipRuleService);
    groupService = module.get<GroupService>(GroupService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('applyRules', () => {
    it('Test 1: should create groups for RELIGION type and assign students with isAutoAssigned=true', async () => {
      const rules: GroupAutoAssignRule[] = [
        {
          groupType: 'RELIGION',
          groupName: '3B-Katholisch',
          studentFilter: { studentIds: ['student-1', 'student-2'] },
        },
        {
          groupType: 'RELIGION',
          groupName: '3B-Ethik',
          studentFilter: { studentIds: ['student-3'] },
        },
      ];

      const result = await ruleService.applyRules('class-3b', rules);

      expect(result.groupsCreated).toBeGreaterThanOrEqual(2);
      expect(result.membershipsCreated).toBe(3);
      // Verify groups created with RELIGION type
      expect(prisma.group.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            groupType: 'RELIGION',
          }),
        }),
      );
      // Verify memberships created with isAutoAssigned=true
      expect(prisma.groupMembership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isAutoAssigned: true,
          }),
        }),
      );
    });

    it('Test 2: should create Standard and AHS level groups for LEISTUNG type', async () => {
      const rules: GroupAutoAssignRule[] = [
        {
          groupType: 'LEISTUNG',
          groupName: '3B-Deutsch-Standard',
          level: 'Standard',
          studentFilter: { studentIds: ['student-1'] },
        },
        {
          groupType: 'LEISTUNG',
          groupName: '3B-Deutsch-AHS',
          level: 'AHS',
          studentFilter: { studentIds: ['student-2', 'student-3'] },
        },
      ];

      const result = await ruleService.applyRules('class-3b', rules);

      expect(result.groupsCreated).toBe(2);
      expect(result.membershipsCreated).toBe(3);
      // Check that level is set
      const createCalls = prisma.group.create.mock.calls;
      const levels = createCalls.map((c: any) => c[0].data.level);
      expect(levels).toContain('Standard');
      expect(levels).toContain('AHS');
    });

    it('Test 3: should preserve manual (isAutoAssigned=false) assignments', async () => {
      // Simulate existing manual membership
      prisma.groupMembership.findUnique.mockResolvedValueOnce({
        id: 'existing-membership',
        groupId: 'group-3B-Katholisch',
        studentId: 'student-1',
        isAutoAssigned: false,
        assignedAt: new Date(),
      });

      const rules: GroupAutoAssignRule[] = [
        {
          groupType: 'RELIGION',
          groupName: '3B-Katholisch',
          studentFilter: { studentIds: ['student-1'] },
        },
      ];

      // The existing group already exists
      prisma.group.findFirst.mockResolvedValueOnce({
        id: 'group-3B-Katholisch',
        name: '3B-Katholisch',
        classId: 'class-3b',
        groupType: 'RELIGION',
      });

      const result = await ruleService.applyRules('class-3b', rules);

      // Manual assignment should not be overwritten; no new membership created for this student
      expect(result.membershipsCreated).toBe(0);
    });

    it('Test 4: clearAutoAssignments removes stale auto-assignments', async () => {
      prisma.groupMembership.deleteMany.mockResolvedValue({ count: 5 });

      // Need to mock group finding for the class
      prisma.group.findFirst.mockResolvedValue(null);
      const mockGroups = [
        { id: 'group-1', classId: 'class-3b' },
        { id: 'group-2', classId: 'class-3b' },
      ];

      // Override findMany for groups in the class
      (prisma as any).group = {
        ...prisma.group,
        findMany: vi.fn().mockResolvedValue(mockGroups),
      };

      const result = await ruleService.clearAutoAssignments('class-3b');

      expect(prisma.groupMembership.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isAutoAssigned: true,
          }),
        }),
      );
    });
  });
});

describe('GroupService', () => {
  let service: GroupService;
  let prisma: any;

  const mockGroup = {
    id: 'group-1',
    classId: 'class-3b',
    name: '3B-Ethik',
    groupType: 'RELIGION',
    level: null,
    subjectId: null,
    memberships: [],
  };

  const mockMembership = {
    id: 'membership-1',
    groupId: 'group-1',
    studentId: 'student-1',
    isAutoAssigned: false,
    assignedAt: new Date(),
  };

  const mockPrismaService = {
    group: {
      create: vi.fn().mockResolvedValue(mockGroup),
      findMany: vi.fn().mockResolvedValue([mockGroup]),
      findUnique: vi.fn().mockResolvedValue(mockGroup),
      delete: vi.fn().mockResolvedValue(mockGroup),
    },
    groupMembership: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(mockMembership),
      delete: vi.fn().mockResolvedValue(mockMembership),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GroupService>(GroupService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Test 5: should create a group under a class', async () => {
    const dto = {
      classId: 'class-3b',
      name: '3B-Ethik',
      groupType: 'RELIGION' as const,
    };

    const result = await service.create(dto);

    expect(prisma.group.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          classId: 'class-3b',
          name: '3B-Ethik',
          groupType: 'RELIGION',
        }),
      }),
    );
    expect(result).toEqual(mockGroup);
  });

  it('Test 6: should add a member with isAutoAssigned=false (manual)', async () => {
    const result = await service.addMember('group-1', 'student-1');

    expect(prisma.groupMembership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          groupId: 'group-1',
          studentId: 'student-1',
          isAutoAssigned: false,
        }),
      }),
    );
    expect(result.isAutoAssigned).toBe(false);
  });

  it('Test 7: should remove a membership', async () => {
    prisma.groupMembership.findUnique.mockResolvedValueOnce(mockMembership);

    await service.removeMember('group-1', 'student-1');

    expect(prisma.groupMembership.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'membership-1' },
      }),
    );
  });

  it('should throw ConflictException on duplicate membership', async () => {
    const { ConflictException } = await import('@nestjs/common');
    prisma.groupMembership.findUnique.mockResolvedValueOnce(mockMembership);

    await expect(service.addMember('group-1', 'student-1')).rejects.toThrow(ConflictException);
  });
});
