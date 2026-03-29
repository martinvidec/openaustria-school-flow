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

  // =====================================================
  // Phase 2: CASL permissions for new subjects
  // =====================================================

  describe('Phase 2 subjects', () => {
    const PHASE2_SUBJECTS = [
      'teacher', 'student', 'class', 'subject',
      'consent', 'retention', 'export', 'dsfa', 'person',
    ];

    it('should grant admin manage on ALL Phase 2 subjects', async () => {
      prismaService.permission.findMany.mockResolvedValue([
        { action: 'manage', subject: 'all', conditions: null, inverted: false },
      ]);
      prismaService.permissionOverride.findMany.mockResolvedValue([]);

      const user: AuthenticatedUser = { id: 'admin-1', email: 'admin@school.at', username: 'admin', roles: ['admin'] };
      const ability = await factory.createForUser(user);

      for (const subj of PHASE2_SUBJECTS) {
        expect(ability.can('create', subj)).toBe(true);
        expect(ability.can('read', subj)).toBe(true);
        expect(ability.can('update', subj)).toBe(true);
        expect(ability.can('delete', subj)).toBe(true);
        expect(ability.can('manage', subj)).toBe(true);
      }
    });

    it('should grant schulleitung full CRUD on Phase 2 entities', async () => {
      prismaService.permission.findMany.mockResolvedValue([
        { action: 'create', subject: 'teacher', conditions: null, inverted: false },
        { action: 'read', subject: 'teacher', conditions: null, inverted: false },
        { action: 'update', subject: 'teacher', conditions: null, inverted: false },
        { action: 'delete', subject: 'teacher', conditions: null, inverted: false },
        { action: 'create', subject: 'student', conditions: null, inverted: false },
        { action: 'read', subject: 'student', conditions: null, inverted: false },
        { action: 'update', subject: 'student', conditions: null, inverted: false },
        { action: 'delete', subject: 'student', conditions: null, inverted: false },
        { action: 'create', subject: 'class', conditions: null, inverted: false },
        { action: 'read', subject: 'class', conditions: null, inverted: false },
        { action: 'update', subject: 'class', conditions: null, inverted: false },
        { action: 'delete', subject: 'class', conditions: null, inverted: false },
        { action: 'create', subject: 'subject', conditions: null, inverted: false },
        { action: 'read', subject: 'subject', conditions: null, inverted: false },
        { action: 'update', subject: 'subject', conditions: null, inverted: false },
        { action: 'delete', subject: 'subject', conditions: null, inverted: false },
        { action: 'create', subject: 'consent', conditions: null, inverted: false },
        { action: 'read', subject: 'consent', conditions: null, inverted: false },
        { action: 'update', subject: 'consent', conditions: null, inverted: false },
        { action: 'create', subject: 'retention', conditions: null, inverted: false },
        { action: 'read', subject: 'retention', conditions: null, inverted: false },
        { action: 'update', subject: 'retention', conditions: null, inverted: false },
        { action: 'delete', subject: 'retention', conditions: null, inverted: false },
        { action: 'create', subject: 'export', conditions: null, inverted: false },
        { action: 'read', subject: 'export', conditions: null, inverted: false },
        { action: 'create', subject: 'dsfa', conditions: null, inverted: false },
        { action: 'read', subject: 'dsfa', conditions: null, inverted: false },
        { action: 'update', subject: 'dsfa', conditions: null, inverted: false },
        { action: 'delete', subject: 'dsfa', conditions: null, inverted: false },
        { action: 'read', subject: 'person', conditions: null, inverted: false },
        { action: 'delete', subject: 'person', conditions: null, inverted: false },
      ]);
      prismaService.permissionOverride.findMany.mockResolvedValue([]);

      const user: AuthenticatedUser = { id: 'sl-1', email: 'direktor@school.at', username: 'schulleitung', roles: ['schulleitung'] };
      const ability = await factory.createForUser(user);

      // Teacher: full CRUD
      expect(ability.can('create', 'teacher')).toBe(true);
      expect(ability.can('read', 'teacher')).toBe(true);
      expect(ability.can('update', 'teacher')).toBe(true);
      expect(ability.can('delete', 'teacher')).toBe(true);
      // Student: full CRUD
      expect(ability.can('create', 'student')).toBe(true);
      expect(ability.can('delete', 'student')).toBe(true);
      // Class: full CRUD
      expect(ability.can('manage', 'class')).toBe(false); // has individual CRUD, not manage
      expect(ability.can('create', 'class')).toBe(true);
      expect(ability.can('read', 'class')).toBe(true);
      // Subject: full CRUD
      expect(ability.can('create', 'subject')).toBe(true);
      // Consent: CRU (no delete)
      expect(ability.can('create', 'consent')).toBe(true);
      expect(ability.can('read', 'consent')).toBe(true);
      expect(ability.can('update', 'consent')).toBe(true);
      // Retention: full CRUD
      expect(ability.can('create', 'retention')).toBe(true);
      expect(ability.can('delete', 'retention')).toBe(true);
      // Export: create + read only
      expect(ability.can('create', 'export')).toBe(true);
      expect(ability.can('read', 'export')).toBe(true);
      // DSFA: full CRUD
      expect(ability.can('create', 'dsfa')).toBe(true);
      expect(ability.can('delete', 'dsfa')).toBe(true);
      // Person: read + delete
      expect(ability.can('read', 'person')).toBe(true);
      expect(ability.can('delete', 'person')).toBe(true);
    });

    it('should grant lehrer read on teacher/student/class/subject, no delete', async () => {
      prismaService.permission.findMany.mockResolvedValue([
        { action: 'read', subject: 'teacher', conditions: null, inverted: false },
        { action: 'read', subject: 'student', conditions: { teacherClasses: '{{ id }}' }, inverted: false },
        { action: 'update', subject: 'student', conditions: { teacherClasses: '{{ id }}' }, inverted: false },
        { action: 'read', subject: 'class', conditions: null, inverted: false },
        { action: 'read', subject: 'subject', conditions: null, inverted: false },
        { action: 'read', subject: 'consent', conditions: null, inverted: false },
        { action: 'create', subject: 'export', conditions: null, inverted: false },
      ]);
      prismaService.permissionOverride.findMany.mockResolvedValue([]);

      const user: AuthenticatedUser = { id: 'teacher-456', email: 'lehrer@school.at', username: 'lehrer', roles: ['lehrer'] };
      const ability = await factory.createForUser(user);

      // Can read teacher, student, class, subject
      expect(ability.can('read', 'teacher')).toBe(true);
      expect(ability.can('read', 'student')).toBe(true);
      expect(ability.can('read', 'class')).toBe(true);
      expect(ability.can('read', 'subject')).toBe(true);
      // Can update student (own classes)
      expect(ability.can('update', 'student')).toBe(true);
      // Can read consent for own students
      expect(ability.can('read', 'consent')).toBe(true);
      // Can request own data export
      expect(ability.can('create', 'export')).toBe(true);
      // Cannot delete teacher, student, class, subject
      expect(ability.can('delete', 'teacher')).toBe(false);
      expect(ability.can('delete', 'student')).toBe(false);
      expect(ability.can('delete', 'class')).toBe(false);
      expect(ability.can('delete', 'subject')).toBe(false);
      // Cannot manage retention, dsfa, person
      expect(ability.can('create', 'retention')).toBe(false);
      expect(ability.can('read', 'dsfa')).toBe(false);
      expect(ability.can('delete', 'person')).toBe(false);
    });

    it('should grant eltern read on own child, consent CRUD, own export', async () => {
      prismaService.permission.findMany.mockResolvedValue([
        { action: 'read', subject: 'student', conditions: { parentId: '{{ id }}' }, inverted: false },
        { action: 'read', subject: 'class', conditions: null, inverted: false },
        { action: 'read', subject: 'subject', conditions: null, inverted: false },
        { action: 'create', subject: 'consent', conditions: null, inverted: false },
        { action: 'read', subject: 'consent', conditions: null, inverted: false },
        { action: 'update', subject: 'consent', conditions: null, inverted: false },
        { action: 'create', subject: 'export', conditions: null, inverted: false },
        { action: 'read', subject: 'export', conditions: null, inverted: false },
      ]);
      prismaService.permissionOverride.findMany.mockResolvedValue([]);

      const user: AuthenticatedUser = { id: 'parent-789', email: 'eltern@home.at', username: 'eltern', roles: ['eltern'] };
      const ability = await factory.createForUser(user);

      // Can read own child's student record (conditions applied at query level)
      expect(ability.can('read', 'student')).toBe(true);
      // Can read class and subject
      expect(ability.can('read', 'class')).toBe(true);
      expect(ability.can('read', 'subject')).toBe(true);
      // Consent: create, read, update
      expect(ability.can('create', 'consent')).toBe(true);
      expect(ability.can('read', 'consent')).toBe(true);
      expect(ability.can('update', 'consent')).toBe(true);
      // Export: create + read
      expect(ability.can('create', 'export')).toBe(true);
      expect(ability.can('read', 'export')).toBe(true);
      // Cannot delete anything
      expect(ability.can('delete', 'student')).toBe(false);
      expect(ability.can('delete', 'consent')).toBe(false);
      expect(ability.can('delete', 'export')).toBe(false);
      // Cannot access teacher management
      expect(ability.can('create', 'teacher')).toBe(false);
      expect(ability.can('read', 'retention')).toBe(false);
      expect(ability.can('read', 'dsfa')).toBe(false);
    });

    it('should grant schueler read on own class/subject/consent, own export', async () => {
      prismaService.permission.findMany.mockResolvedValue([
        { action: 'read', subject: 'class', conditions: { studentId: '{{ id }}' }, inverted: false },
        { action: 'read', subject: 'subject', conditions: null, inverted: false },
        { action: 'read', subject: 'consent', conditions: { studentId: '{{ id }}' }, inverted: false },
        { action: 'create', subject: 'export', conditions: null, inverted: false },
        { action: 'read', subject: 'export', conditions: null, inverted: false },
      ]);
      prismaService.permissionOverride.findMany.mockResolvedValue([]);

      const user: AuthenticatedUser = { id: 'student-001', email: 'schueler@school.at', username: 'schueler', roles: ['schueler'] };
      const ability = await factory.createForUser(user);

      // Can read own class and subjects
      expect(ability.can('read', 'class')).toBe(true);
      expect(ability.can('read', 'subject')).toBe(true);
      // Can read own consent
      expect(ability.can('read', 'consent')).toBe(true);
      // Can request and read own export
      expect(ability.can('create', 'export')).toBe(true);
      expect(ability.can('read', 'export')).toBe(true);
      // Cannot modify anything
      expect(ability.can('create', 'class')).toBe(false);
      expect(ability.can('update', 'class')).toBe(false);
      expect(ability.can('delete', 'class')).toBe(false);
      expect(ability.can('create', 'student')).toBe(false);
      expect(ability.can('read', 'teacher')).toBe(false);
      expect(ability.can('read', 'retention')).toBe(false);
      expect(ability.can('read', 'dsfa')).toBe(false);
      expect(ability.can('delete', 'person')).toBe(false);
    });

    it('should interpolate conditions with user ID for Phase 2 scoped subjects', async () => {
      prismaService.permission.findMany.mockResolvedValue([
        { action: 'read', subject: 'student', conditions: { parentId: '{{ id }}' }, inverted: false },
        { action: 'read', subject: 'consent', conditions: { personId: '{{ id }}' }, inverted: false },
      ]);
      prismaService.permissionOverride.findMany.mockResolvedValue([]);

      const user: AuthenticatedUser = { id: 'parent-abc', email: 'parent@home.at', username: 'eltern', roles: ['eltern'] };
      const ability = await factory.createForUser(user);

      // Conditions are interpolated -- ability.can returns true, query-level enforcement happens in service
      expect(ability.can('read', 'student')).toBe(true);
      expect(ability.can('read', 'consent')).toBe(true);
      // Cannot access what is not granted
      expect(ability.can('update', 'student')).toBe(false);
    });
  });
});
