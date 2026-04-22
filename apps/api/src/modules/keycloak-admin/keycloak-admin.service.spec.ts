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
});
