import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KeycloakAdminService } from './keycloak-admin.service';
import { PrismaService } from '../../config/database/prisma.service';

// Hoisted shared mock object so the vi.mock factory can reference it.
const kcMock = vi.hoisted(() => ({
  auth: vi.fn(),
  users: {
    find: vi.fn(),
    count: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    listRealmRoleMappings: vi.fn(),
    addRealmRoleMappings: vi.fn(),
    delRealmRoleMappings: vi.fn(),
  },
  roles: {
    findOneByName: vi.fn(),
  },
}));

// Constructor mock — the service calls `new KeycloakAdminClient(...)` so the
// default export must be a class-like function returning the shared kcMock.
vi.mock('@keycloak/keycloak-admin-client', () => ({
  default: function MockKeycloakAdminClient() {
    return kcMock;
  },
}));

const mockConfig = {
  getOrThrow: vi.fn((key: string) => {
    const map: Record<string, string> = {
      KEYCLOAK_URL: 'http://localhost:8080',
      KEYCLOAK_REALM: 'schoolflow',
      KEYCLOAK_ADMIN_CLIENT_ID: 'schoolflow-admin',
      KEYCLOAK_ADMIN_CLIENT_SECRET: 'secret',
    };
    return map[key];
  }),
};

const mockPrisma = {
  person: {
    findUnique: vi.fn(),
  },
};

describe('KeycloakAdminService', () => {
  let service: KeycloakAdminService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeycloakAdminService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<KeycloakAdminService>(KeycloakAdminService);
    service.onModuleInit();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Existing surface (Phase 12) — keep regression coverage
  // ---------------------------------------------------------------------------

  it('caches service-account token across calls (no re-auth if within TTL)', async () => {
    kcMock.users.find.mockResolvedValue([]);
    await service.findUsersByEmail('maria');
    await service.findUsersByEmail('max');
    expect(kcMock.auth).toHaveBeenCalledTimes(1);
  });

  it('re-auths when token TTL expires', async () => {
    kcMock.users.find.mockResolvedValue([]);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    await service.findUsersByEmail('maria');
    expect(kcMock.auth).toHaveBeenCalledTimes(1);

    // Advance past 5 minute TTL (default)
    vi.setSystemTime(new Date('2026-01-01T00:05:01Z'));
    await service.findUsersByEmail('max');
    expect(kcMock.auth).toHaveBeenCalledTimes(2);
  });

  it('enriches results with alreadyLinkedToPersonId via Prisma lookup', async () => {
    kcMock.users.find.mockResolvedValue([
      { id: 'kc-1', email: 'maria@schule.at', firstName: 'Maria', lastName: 'Huber', enabled: true },
    ]);
    mockPrisma.person.findUnique.mockResolvedValue({
      id: 'person-99',
      firstName: 'Maria',
      lastName: 'Huber',
    });

    const results = await service.findUsersByEmail('maria');

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'kc-1',
      email: 'maria@schule.at',
      alreadyLinkedToPersonId: 'person-99',
      alreadyLinkedToPersonName: 'Maria Huber',
    });
    expect(mockPrisma.person.findUnique).toHaveBeenCalledWith({
      where: { keycloakUserId: 'kc-1' },
      select: { id: true, firstName: true, lastName: true },
    });
  });

  it('returns empty array when no users match', async () => {
    kcMock.users.find.mockResolvedValue([]);
    const results = await service.findUsersByEmail('noone');
    expect(results).toEqual([]);
    expect(mockPrisma.person.findUnique).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Phase 13-01 Task 2 additions
  // ---------------------------------------------------------------------------

  it('findUsers passes pagination + search params through to client.users.find', async () => {
    kcMock.users.find.mockResolvedValue([{ id: 'kc-1', email: 'a@b.c' }]);
    const result = await service.findUsers({ first: 25, max: 25, search: 'anna' });
    expect(kcMock.users.find).toHaveBeenCalledWith({ first: 25, max: 25, search: 'anna' });
    expect(result).toEqual([{ id: 'kc-1', email: 'a@b.c' }]);
  });

  it('countUsers returns the integer total from client.users.count', async () => {
    kcMock.users.count.mockResolvedValue(42);
    const total = await service.countUsers({ search: 'anna' });
    expect(total).toBe(42);
    expect(kcMock.users.count).toHaveBeenCalledWith({ search: 'anna' });
  });

  it('findUserById returns the user representation when found', async () => {
    kcMock.users.findOne.mockResolvedValue({ id: 'kc-1', email: 'a@b.c' });
    const user = await service.findUserById('kc-1');
    expect(user).toEqual({ id: 'kc-1', email: 'a@b.c' });
    expect(kcMock.users.findOne).toHaveBeenCalledWith({ id: 'kc-1' });
  });

  it('findUserById returns undefined when KC throws 404', async () => {
    kcMock.users.findOne.mockRejectedValue({ response: { status: 404 } });
    const user = await service.findUserById('missing');
    expect(user).toBeUndefined();
  });

  it('setEnabled forwards to client.users.update with the enabled flag', async () => {
    kcMock.users.update.mockResolvedValue(undefined);
    await service.setEnabled('kc-1', false);
    expect(kcMock.users.update).toHaveBeenCalledWith({ id: 'kc-1' }, { enabled: false });
  });

  it('listRealmRoleMappings returns id+name pairs', async () => {
    kcMock.users.listRealmRoleMappings.mockResolvedValue([
      { id: 'r1', name: 'admin', description: 'ignored' },
    ]);
    const roles = await service.listRealmRoleMappings('kc-1');
    expect(roles).toEqual([{ id: 'r1', name: 'admin' }]);
    expect(kcMock.users.listRealmRoleMappings).toHaveBeenCalledWith({ id: 'kc-1' });
  });

  it('addRealmRoleMappings forwards a non-empty role array', async () => {
    await service.addRealmRoleMappings('kc-1', [{ id: 'r1', name: 'admin' }]);
    expect(kcMock.users.addRealmRoleMappings).toHaveBeenCalledWith({
      id: 'kc-1',
      roles: [{ id: 'r1', name: 'admin' }],
    });
  });

  it('addRealmRoleMappings short-circuits on an empty role array (no KC call)', async () => {
    await service.addRealmRoleMappings('kc-1', []);
    expect(kcMock.users.addRealmRoleMappings).not.toHaveBeenCalled();
  });

  it('delRealmRoleMappings forwards a non-empty role array', async () => {
    await service.delRealmRoleMappings('kc-1', [{ id: 'r1', name: 'admin' }]);
    expect(kcMock.users.delRealmRoleMappings).toHaveBeenCalledWith({
      id: 'kc-1',
      roles: [{ id: 'r1', name: 'admin' }],
    });
  });

  it('findRealmRoleByName returns the matching role pair', async () => {
    kcMock.roles.findOneByName.mockResolvedValue({ id: 'r1', name: 'admin' });
    const role = await service.findRealmRoleByName('admin');
    expect(role).toEqual({ id: 'r1', name: 'admin' });
  });

  it('findRealmRoleByName returns undefined when KC returns nothing', async () => {
    kcMock.roles.findOneByName.mockResolvedValue(undefined);
    const role = await service.findRealmRoleByName('nonexistent');
    expect(role).toBeUndefined();
  });
});
