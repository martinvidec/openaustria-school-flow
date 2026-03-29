import { Test, TestingModule } from '@nestjs/testing';
import { CaslAbilityFactory } from './casl-ability.factory';
import { PrismaService } from '../../../config/database/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-user';

describe('CaslAbilityFactory', () => {
  let factory: CaslAbilityFactory;
  let prismaService: any;

  const mockPrismaService = {
    permission: {
      findMany: vi.fn(),
    },
    permissionOverride: {
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaslAbilityFactory,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    factory = module.get<CaslAbilityFactory>(CaslAbilityFactory);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should grant admin manage all (AUTH-01)', async () => {
    prismaService.permission.findMany.mockResolvedValue([
      { action: 'manage', subject: 'all', conditions: null, inverted: false },
    ]);
    prismaService.permissionOverride.findMany.mockResolvedValue([]);

    const user: AuthenticatedUser = { id: 'u1', email: 'a@test.com', username: 'admin', roles: ['admin'] };
    const ability = await factory.createForUser(user);

    expect(ability.can('create', 'school')).toBe(true);
    expect(ability.can('delete', 'user')).toBe(true);
    expect(ability.can('read', 'audit')).toBe(true);
  });

  it('should scope lehrer to own data via conditions (AUTH-03)', async () => {
    prismaService.permission.findMany.mockResolvedValue([
      { action: 'read', subject: 'grades', conditions: { teacherId: '{{ id }}' }, inverted: false },
    ]);
    prismaService.permissionOverride.findMany.mockResolvedValue([]);

    const user: AuthenticatedUser = { id: 'teacher-123', email: 't@test.com', username: 'lehrer', roles: ['lehrer'] };
    const ability = await factory.createForUser(user);

    // With conditions, ability.can returns true but the conditions must be checked at query level
    expect(ability.can('read', 'grades')).toBe(true);
  });

  it('should merge permissions for multi-role user (D-04)', async () => {
    prismaService.permission.findMany.mockResolvedValue([
      // lehrer permissions
      { action: 'read', subject: 'timetable', conditions: null, inverted: false },
      { action: 'manage', subject: 'classbook', conditions: { teacherId: '{{ id }}' }, inverted: false },
      // eltern permissions
      { action: 'read', subject: 'grades', conditions: { parentId: '{{ id }}' }, inverted: false },
    ]);
    prismaService.permissionOverride.findMany.mockResolvedValue([]);

    const user: AuthenticatedUser = { id: 'dual-role-user', email: 'd@test.com', username: 'dual', roles: ['lehrer', 'eltern'] };
    const ability = await factory.createForUser(user);

    // Has both lehrer AND eltern permissions (union)
    expect(ability.can('read', 'timetable')).toBe(true);
    expect(ability.can('manage', 'classbook')).toBe(true);
    expect(ability.can('read', 'grades')).toBe(true);
  });

  it('should apply ACL overrides over role defaults (D-02)', async () => {
    prismaService.permission.findMany.mockResolvedValue([
      { action: 'read', subject: 'school', conditions: null, inverted: false },
    ]);
    // Override: deny read on school for this user
    prismaService.permissionOverride.findMany.mockResolvedValue([
      { action: 'read', subject: 'school', conditions: null, granted: false },
    ]);

    const user: AuthenticatedUser = { id: 'u2', email: 'b@test.com', username: 'lehrer2', roles: ['lehrer'] };
    const ability = await factory.createForUser(user);

    expect(ability.can('read', 'school')).toBe(false);
  });

  it('should handle user with no permissions', async () => {
    prismaService.permission.findMany.mockResolvedValue([]);
    prismaService.permissionOverride.findMany.mockResolvedValue([]);

    const user: AuthenticatedUser = { id: 'u3', email: 'c@test.com', username: 'nobody', roles: [] };
    const ability = await factory.createForUser(user);

    expect(ability.can('read', 'school')).toBe(false);
    expect(ability.can('manage', 'all')).toBe(false);
  });
});
