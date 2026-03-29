# Phase 1: Project Scaffolding & Auth - Research

**Researched:** 2026-03-29
**Domain:** NestJS monorepo scaffolding, Keycloak OIDC auth, RBAC/ACL authorization, Prisma 7 ORM, Docker Compose dev environment, OpenAPI documentation
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire project foundation: a pnpm + Turborepo monorepo with a NestJS 11 API (Fastify adapter), PostgreSQL 17 via Prisma 7, Keycloak 26.5 for OIDC authentication, a hybrid RBAC+ACL authorization system using CASL, an audit trail via Prisma client extensions + PostgreSQL triggers, and Docker Compose for one-command development startup. Every subsequent phase builds on this.

The technology stack is well-defined in CLAUDE.md with specific version pins. Research confirms all choices are current, well-supported, and compatible. The primary complexity lies in: (1) Prisma 7's new driver-adapter architecture requiring explicit configuration for NestJS CJS compatibility, (2) the hybrid RBAC+ACL authorization system with database-persisted permissions using CASL, and (3) coordinating Keycloak realm/role setup with NestJS JWT validation.

**Primary recommendation:** Build a custom Passport-JWT strategy with `jwks-rsa` for Keycloak integration (not `nest-keycloak-connect` which has NestJS 11 compatibility issues), CASL for authorization with Prisma-stored permissions, and Prisma client extensions (not deprecated middleware) for audit logging.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** RBAC + ACL Hybrid -- 5 Standardrollen (Admin, Schulleitung, Lehrer, Eltern, Schueler) definieren Default-Berechtigungen auf Action-Level (module.action, z.B. timetable.view, classbook.grades.write). Admins koennen per ACL einzelne Permissions pro Rolle/User ueberschreiben.
- **D-02:** ACL-Overrides ueber API + UI konfigurierbar -- Admins koennen Rechte im Browser anpassen, Aenderungen sofort wirksam. Kein Config-File oder Server-Zugriff noetig.
- **D-03:** Admin = System (Keycloak, Docker, API-Keys, System-Einstellungen), Schulleitung = Paedagogik (Lehrer-/Klassenverwaltung, Stundenplan, Klassenbuch-Einsicht, Rechte-Overrides). Klare Trennung IT vs. Schulbetrieb.
- **D-04:** Multi-Rollen erlaubt -- ein User kann mehrere Rollen gleichzeitig haben (z.B. Lehrer + Elternteil). Rechte werden vereinigt (Union aller Rollen-Permissions).
- **D-05:** Mutations + sensible Reads -- alle Schreib-/Loeschoperationen werden geloggt. Lesezugriffe nur bei sensiblen Daten (Noten, persoenliche Daten, Gesundheitsdaten). Nicht-sensitive Reads (Stundenplan abrufen) werden nicht geloggt.
- **D-06:** Gestaffelte Sichtbarkeit -- Admin sieht gesamten Audit Trail, Schulleitung sieht paedagogisch relevante Eintraege (Notenaenderungen, Klassenbuch), jeder User kann eigene Audit-Eintraege einsehen (DSGVO Art. 15 kompatibel).
- **D-07:** Retention konfigurierbar mit Default 3 Jahre (oesterreichische Aufbewahrungspflicht fuer Schulunterlagen). Automatische Bereinigung aelterer Eintraege. Admin kann Retention pro Kategorie setzen.
- **D-08:** Zeitraster mit Perioden + Pausen -- jede Unterrichtsperiode mit Start/Ende-Zeit, Pausenzeiten dazwischen. Verschiedene Periodenlaengen moeglich (50min, 45min, Doppelstunden-Bloecke).
- **D-09:** Vordefinierte Templates fuer oesterreichische Schultypen (VS, MS, AHS Unterstufe, AHS Oberstufe, BHS) als Seed-Daten. Admin waehlt Template und kann es anpassen.
- **D-10:** Schultage frei konfigurierbar -- Admin waehlt beliebige Wochentage. Default Mo-Fr, aber auch Mo-Sa oder andere Kombinationen moeglich.
- **D-11:** Volles Schuljahr im Schulprofil -- Schuljahresstart, Semestergrenze, Schulschluss, Ferienzeiten, schulautonome Tage. Gibt dem Stundenplan-Solver spaeter den zeitlichen Rahmen.
- **D-12:** RFC 9457 Problem Details als Error-Response-Format (application/problem+json mit type, title, status, detail, instance, traceId).
- **D-13:** URL-Praefix Versionierung: /api/v1/. Alte Versionen koennen bei Breaking Changes parallel weiterlaufen.
- **D-14:** Offset/Limit Paginierung mit Total Count als Standard. Response-Format: { data: [...], meta: { page, limit, total, totalPages } }.
- **D-15:** Englische API (Endpoints, Felder, Doku), deutsche UI-Texte und Fehlermeldungen. Internationale Contributors verstehen die API, deutschsprachige Schuladmins verstehen die Fehler.

### Claude's Discretion
- Monorepo Package-Struktur (apps/ vs packages/ Layout)
- NestJS Module-Organisation und Guard/Interceptor-Patterns
- Docker Compose Service-Konfiguration
- Prisma Schema-Design und Migrations-Strategie
- OpenAPI/Swagger Konfiguration und Decorator-Patterns
- Keycloak Realm/Client Setup und Token-Mapping

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Admin kann Schulprofil anlegen (Name, Typ, Zeitraster, Unterrichtstage) | Prisma schema design for School model with time grid, periods, breaks, school days, school year structure. Seed data templates for Austrian school types (D-08, D-09, D-10, D-11). |
| AUTH-01 | System unterstuetzt 5 Standardrollen: Administrator, Schulleitung, Lehrer, Eltern, Schueler | Keycloak realm roles + CASL ability factory with database-persisted default permissions per role (D-01). Multi-role union logic (D-04). |
| AUTH-02 | Zugriffsrechte sind pro Modul feingranular konfigurierbar | CASL permissions stored in PostgreSQL with action/subject/conditions pattern. ACL override API for admin configuration (D-01, D-02). |
| AUTH-03 | Datensichtbarkeit ist rollenbasiert eingeschraenkt (Eltern sehen nur eigenes Kind, Lehrer nur eigene Klassen) | CASL conditions with templated user context (e.g., `{ userId: '{{ id }}' }`). Prisma query-level filtering via `@casl/prisma`. |
| AUTH-04 | System fuehrt Audit-Trail ueber alle Datenzugriffe und -aenderungen | Prisma client extensions + PostgreSQL audit triggers for mutations. NestJS interceptor for sensitive read logging (D-05, D-06, D-07). |
| AUTH-05 | Authentifizierung ueber Keycloak (OIDC/SAML, LDAP/AD-Anbindung) | Custom Passport-JWT strategy with `jwks-rsa` for JWKS validation against Keycloak 26.5. Realm export JSON for reproducible setup. |
| AUTH-06 | Session bleibt ueber Browser-Refresh bestehen | Keycloak OIDC refresh token flow. Access token (5-15 min) + refresh token stored client-side. NestJS validates JWT statelessly. |
| DEPLOY-01 | System laesst sich mit einem Befehl via Docker Compose starten | Docker Compose with api, postgres, redis, keycloak services. Volume mounts for realm import. Health checks for startup ordering. |
| API-01 | Alle Funktionen sind ueber dokumentierte REST-API verfuegbar | NestJS controllers with Swagger decorators. All business logic behind REST endpoints. |
| API-02 | API-Dokumentation wird automatisch generiert (OpenAPI/Swagger) | `@nestjs/swagger` with DocumentBuilder. Auto-generated from decorators. Served at /api/docs. |
| API-03 | API unterstuetzt Token-basierte Authentifizierung (OAuth2/OIDC) | `.addOAuth2()` security scheme in Swagger config. `@ApiBearerAuth()` on protected controllers. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version (verified) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| NestJS | 11.1.17 | API framework | Modular DI, guards, interceptors, decorators. SWC compiler default. Vitest default. |
| @nestjs/platform-fastify | 11.1.17 | HTTP adapter | Faster than Express. Native NestJS support. Required per CLAUDE.md. |
| Prisma | 7.6.0 | ORM + migrations | Pure TypeScript engine (no Rust). Schema-first. Driver adapter architecture. |
| @prisma/adapter-pg | 7.6.0 | PostgreSQL driver adapter | Required by Prisma 7 -- no built-in drivers anymore. |
| pg | 8.20.0 | PostgreSQL client | Underlying driver for @prisma/adapter-pg. |
| @nestjs/passport | 11.0.5 | Auth framework | Passport.js integration for NestJS. Strategy pattern. |
| passport-jwt | 4.0.1 | JWT strategy | Validates Keycloak JWT tokens. |
| jwks-rsa | 4.0.1 | JWKS client | Auto-fetches + caches Keycloak public keys from JWKS endpoint. |
| @casl/ability | 6.8.0 | Authorization | Isomorphic RBAC+ABAC. Database-persisted permissions. Conditions support. |
| @casl/prisma | 1.6.1 | CASL Prisma integration | Query-level filtering with CASL abilities applied to Prisma queries. |
| @nestjs/swagger | 11.2.6 | OpenAPI docs | Auto-generated Swagger from decorators. OAuth2 security schemes. |
| @nestjs/config | 4.0.3 | Configuration | Environment variable management. Type-safe config. |
| @nestjs/jwt | 11.0.2 | JWT utilities | Token decode/sign helpers (used alongside passport-jwt). |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nestjs/bullmq | 11.0.4 | Queue integration | Audit trail cleanup jobs, future timetable generation. |
| bullmq | 5.71.1 | Job queue | Redis-backed async jobs. |
| class-validator | latest | DTO validation | Request body validation with decorators. |
| class-transformer | latest | DTO transformation | Serialization/deserialization of DTOs. |
| @sjfrhafe/nest-problem-details | 1.2.1 | RFC 9457 errors | Problem Details exception filter (application/problem+json). D-12 compliance. |
| nestjs-pino | latest | Logging | Structured JSON logging via Pino. NestJS 11 integration. |
| pino | 9.x | Logger | Fastest Node.js JSON logger. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom Passport-JWT | nest-keycloak-connect 1.10.1 | nest-keycloak-connect has NestJS 11 peer dep issues (Issue #197). v2.0.0-alpha.2 exists but is pre-release. Custom approach gives full control and multi-IdP readiness. |
| CASL | Casbin | Casbin is policy-file driven, less TypeScript-native. CASL integrates directly with Prisma for query-level filtering. |
| Prisma client extensions (audit) | Prisma middleware | Prisma middleware was deprecated in v4.16.0 and removed in v6.14.0. Client extensions are the replacement. |
| @sjfrhafe/nest-problem-details | Custom exception filter | Library handles the full RFC 9457 spec. Content-Type header, field mapping, edge cases. Not worth hand-rolling. |

**Installation:**
```bash
# Core API
pnpm add @nestjs/core@^11 @nestjs/common@^11 @nestjs/platform-fastify@^11 @nestjs/swagger@^11 @nestjs/config@^4 @nestjs/passport@^11 @nestjs/jwt@^11 @nestjs/bullmq@^11

# Database
pnpm add @prisma/client@^7 @prisma/adapter-pg@^7 pg

# Auth + Authorization
pnpm add passport passport-jwt jwks-rsa @casl/ability@^6 @casl/prisma@^1

# Validation + Error handling
pnpm add class-validator class-transformer @sjfrhafe/nest-problem-details

# Logging
pnpm add nestjs-pino pino pino-http

# Queue
pnpm add bullmq

# Dev dependencies
pnpm add -D prisma@^7 @nestjs/cli @nestjs/testing @types/pg typescript@~6.0 vitest @swc/core @swc/cli
```

## Architecture Patterns

### Recommended Monorepo Structure

```
openaustria-school-flow/
├── apps/
│   └── api/                     # NestJS 11 API application
│       ├── src/
│       │   ├── main.ts          # Bootstrap with Fastify adapter
│       │   ├── app.module.ts    # Root module
│       │   ├── modules/
│       │   │   ├── auth/        # Keycloak JWT + Guards + CASL
│       │   │   │   ├── auth.module.ts
│       │   │   │   ├── strategies/
│       │   │   │   │   └── keycloak-jwt.strategy.ts
│       │   │   │   ├── guards/
│       │   │   │   │   ├── jwt-auth.guard.ts
│       │   │   │   │   ├── roles.guard.ts
│       │   │   │   │   └── permissions.guard.ts
│       │   │   │   ├── decorators/
│       │   │   │   │   ├── public.decorator.ts
│       │   │   │   │   ├── roles.decorator.ts
│       │   │   │   │   ├── check-permissions.decorator.ts
│       │   │   │   │   └── current-user.decorator.ts
│       │   │   │   ├── casl/
│       │   │   │   │   ├── casl-ability.factory.ts
│       │   │   │   │   └── casl.module.ts
│       │   │   │   └── dto/
│       │   │   ├── school/      # School profile CRUD
│       │   │   │   ├── school.module.ts
│       │   │   │   ├── school.controller.ts
│       │   │   │   ├── school.service.ts
│       │   │   │   └── dto/
│       │   │   ├── audit/       # Audit trail service
│       │   │   │   ├── audit.module.ts
│       │   │   │   ├── audit.service.ts
│       │   │   │   ├── audit.controller.ts
│       │   │   │   └── audit.interceptor.ts
│       │   │   └── health/      # Health check endpoints
│       │   ├── common/
│       │   │   ├── filters/     # RFC 9457 exception filter
│       │   │   ├── interceptors/
│       │   │   ├── pipes/
│       │   │   └── dto/         # Shared pagination DTOs
│       │   └── config/
│       │       └── database/
│       │           ├── generated/  # Prisma generated client
│       │           ├── prisma.service.ts
│       │           └── prisma.module.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts          # Austrian school type templates
│       ├── prisma.config.ts     # Prisma 7 config file
│       ├── nest-cli.json
│       └── tsconfig.json
├── packages/
│   └── shared/                  # Shared types, validation, constants
│       ├── src/
│       │   ├── types/           # API types, role enums
│       │   ├── validation/      # Zod schemas (future)
│       │   └── constants/       # Role names, permission actions
│       ├── package.json
│       └── tsconfig.json
├── docker/
│   ├── docker-compose.yml       # Full dev stack
│   ├── docker-compose.override.yml  # Local dev overrides
│   └── keycloak/
│       └── realm-export.json    # SchoolFlow realm config
├── turbo.json
├── pnpm-workspace.yaml
├── package.json                 # Root workspace config
├── tsconfig.base.json           # Shared TS config
└── .env.example
```

### Pattern 1: Custom Passport-JWT Strategy for Keycloak

**What:** A JWT validation strategy that fetches Keycloak public keys via JWKS and validates tokens without depending on `nest-keycloak-connect`.
**When to use:** Always -- this is the primary auth mechanism.

```typescript
// apps/api/src/modules/auth/strategies/keycloak-jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KeycloakJwtStrategy extends PassportStrategy(Strategy, 'keycloak-jwt') {
  constructor(private configService: ConfigService) {
    const keycloakUrl = configService.get<string>('KEYCLOAK_URL');
    const realm = configService.get<string>('KEYCLOAK_REALM');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
      }),
      issuer: `${keycloakUrl}/realms/${realm}`,
      algorithms: ['RS256'],
    });
  }

  validate(payload: KeycloakTokenPayload) {
    // Extract and merge realm + client roles
    const realmRoles = payload.realm_access?.roles ?? [];
    const clientRoles = Object.values(payload.resource_access ?? {})
      .flatMap((r) => r.roles);

    return {
      id: payload.sub,
      email: payload.email,
      username: payload.preferred_username,
      roles: [...new Set([...realmRoles, ...clientRoles])],
    };
  }
}
```

### Pattern 2: CASL Ability Factory with Database-Persisted Permissions (D-01, D-02)

**What:** Loads permissions from PostgreSQL, builds CASL abilities, supports ACL overrides per user.
**When to use:** Every authorized request.

```typescript
// apps/api/src/modules/auth/casl/casl-ability.factory.ts
import { Injectable } from '@nestjs/common';
import { AbilityBuilder, PureAbility, createMongoAbility } from '@casl/ability';
import { PrismaService } from '../../../config/database/prisma.service';

type AppAbility = PureAbility<[string, string]>;

@Injectable()
export class CaslAbilityFactory {
  constructor(private prisma: PrismaService) {}

  async createForUser(user: { id: string; roles: string[] }): Promise<AppAbility> {
    const builder = new AbilityBuilder<AppAbility>(createMongoAbility);

    // 1. Load default permissions for all user roles (union)
    const rolePermissions = await this.prisma.permission.findMany({
      where: { role: { name: { in: user.roles } } },
    });

    // 2. Load user-specific ACL overrides
    const userOverrides = await this.prisma.permissionOverride.findMany({
      where: { userId: user.id },
    });

    // 3. Apply role permissions
    for (const perm of rolePermissions) {
      const conditions = perm.conditions
        ? this.parseConditions(perm.conditions, user)
        : undefined;

      if (perm.inverted) {
        builder.cannot(perm.action, perm.subject, conditions);
      } else {
        builder.can(perm.action, perm.subject, conditions);
      }
    }

    // 4. Apply user-level overrides (take precedence)
    for (const override of userOverrides) {
      const conditions = override.conditions
        ? this.parseConditions(override.conditions, user)
        : undefined;

      if (override.granted) {
        builder.can(override.action, override.subject, conditions);
      } else {
        builder.cannot(override.action, override.subject, conditions);
      }
    }

    return builder.build();
  }

  private parseConditions(conditions: Record<string, unknown>, user: { id: string }) {
    // Replace template variables: {{ id }} -> user.id
    const parsed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(conditions)) {
      if (typeof value === 'string' && value.includes('{{ id }}')) {
        parsed[key] = user.id;
      } else {
        parsed[key] = value;
      }
    }
    return parsed;
  }
}
```

### Pattern 3: Prisma 7 Service with Driver Adapter

**What:** PrismaService configured for Prisma 7's new driver-adapter architecture.
**When to use:** All database access.

```typescript
// apps/api/src/config/database/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: configService.get<string>('DATABASE_URL'),
      pool: { max: 10, connectionTimeoutMillis: 30000 },
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### Pattern 4: Audit Trail via Prisma Client Extensions + Interceptor (D-05, D-06)

**What:** Two-layer audit: PostgreSQL triggers for mutations (via Prisma extension setting user context), NestJS interceptor for sensitive reads.
**When to use:** Globally registered.

```typescript
// Prisma extension for setting user context on DB connection
// Used by PostgreSQL audit triggers to log who made the change
const auditExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      $allOperations({ args, query, operation }) {
        // For mutations, wrap in transaction and set user context
        if (['create', 'update', 'delete', 'upsert'].includes(operation)) {
          return client.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.current_user_id', ${currentUserId}, true)`;
            return query(args);
          });
        }
        return query(args);
      },
    },
  });
});
```

### Pattern 5: RFC 9457 Problem Details Error Response (D-12)

**What:** All API errors return `application/problem+json` format.
**When to use:** Global exception filter.

```typescript
// apps/api/src/main.ts
import { ProblemDetailFilter } from '@sjfrhafe/nest-problem-details';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.setGlobalPrefix('api/v1');  // D-13
  app.useGlobalFilters(new ProblemDetailFilter());

  // Swagger setup with OAuth2
  const config = new DocumentBuilder()
    .setTitle('SchoolFlow API')
    .setVersion('1.0')
    .addOAuth2({
      type: 'oauth2',
      flows: {
        authorizationCode: {
          authorizationUrl: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/auth`,
          tokenUrl: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
          scopes: { openid: 'OpenID', profile: 'Profile', email: 'Email' },
        },
      },
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000, '0.0.0.0');
}
```

### Anti-Patterns to Avoid

- **Prisma middleware for audit logging:** Removed in Prisma v6.14.0. Use client extensions instead.
- **nest-keycloak-connect for NestJS 11:** v1.10.1 has peer dependency issues with NestJS 11 (see GitHub Issue #197). v2.0.0 is alpha. Use custom Passport-JWT strategy.
- **Importing from `@prisma/client`:** Prisma 7 generates to a custom output path. Import from the generated folder, e.g., `./generated/prisma/client.js`.
- **ESM Prisma output with NestJS:** NestJS uses CJS. Set `moduleFormat = "cjs"` in the Prisma generator block.
- **Hardcoded roles in guards:** With the ACL override system (D-02), permissions must be loaded from DB at runtime, not hardcoded in decorators.
- **Keycloak admin credentials in code:** Use `KC_BOOTSTRAP_ADMIN_USERNAME` / `KC_BOOTSTRAP_ADMIN_PASSWORD` env vars (new in Keycloak 26, replaces `KEYCLOAK_ADMIN`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT validation + JWKS rotation | Custom JWKS fetcher | `jwks-rsa` + `passport-jwt` | Key rotation, caching, rate limiting are handled. |
| Authorization engine | Custom permission checker | CASL (`@casl/ability` + `@casl/prisma`) | Conditions, inverted rules, query-level filtering, template variables. |
| RFC 9457 error responses | Custom exception filter | `@sjfrhafe/nest-problem-details` | Content-type headers, field mapping, edge cases in spec. |
| OpenAPI documentation | Manual API docs | `@nestjs/swagger` decorators | Auto-generated from code, always in sync. |
| Database migrations | Raw SQL migration files | `prisma migrate` | Schema diffing, rollback tracking, deterministic ordering. |
| Config management | Manual env parsing | `@nestjs/config` | Validation, type safety, module-scoped config. |
| Keycloak realm setup | Manual UI clicks | Realm export JSON + `--import-realm` | Reproducible across environments. Version-controlled. |

**Key insight:** This phase has many moving parts (auth, RBAC, ACL, audit, API docs, Docker). Using established libraries for each prevents subtle security bugs and halves the implementation time. The custom work should focus on the CASL ability factory (business-specific role/permission logic) and the Prisma schema design (school domain model).

## Common Pitfalls

### Pitfall 1: Prisma 7 ESM/CJS Mismatch with NestJS
**What goes wrong:** Prisma 7 generates ESM by default. NestJS compiles to CJS. Import fails at runtime with "require() of ES Module" error.
**Why it happens:** Prisma 7 removed the Rust engine and ships as pure TypeScript ESM. NestJS still defaults to CJS compilation.
**How to avoid:** Set `moduleFormat = "cjs"` in the generator block of `schema.prisma`. Always import from the generated output path, not `@prisma/client`.
**Warning signs:** `ERR_REQUIRE_ESM` errors at startup.

### Pitfall 2: Prisma 7 Requires Driver Adapter
**What goes wrong:** `PrismaClient` constructor throws "No adapter provided" error.
**Why it happens:** Prisma 7 removed built-in database drivers. You must explicitly provide a driver adapter.
**How to avoid:** Install `@prisma/adapter-pg` and `pg`. Pass `new PrismaPg({ connectionString })` as the `adapter` option to `PrismaClient`.
**Warning signs:** Missing `@prisma/adapter-pg` in dependencies. No `adapter` in PrismaClient constructor.

### Pitfall 3: Prisma 7 DATABASE_URL Location Change
**What goes wrong:** Prisma CLI commands fail with "datasource url not found."
**Why it happens:** Prisma 7 moves DATABASE_URL from `schema.prisma` to `prisma.config.ts`. The `url = env("DATABASE_URL")` in the datasource block is removed.
**How to avoid:** Create `prisma.config.ts` at project root with `datasource.url` configured via `env('DATABASE_URL')`.
**Warning signs:** `prisma migrate` or `prisma generate` fails after upgrade.

### Pitfall 4: Keycloak 26 Changed Admin Env Vars
**What goes wrong:** Keycloak container starts but no admin account exists.
**Why it happens:** Keycloak 26 replaced `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` with `KC_BOOTSTRAP_ADMIN_USERNAME` / `KC_BOOTSTRAP_ADMIN_PASSWORD`.
**How to avoid:** Use the `KC_BOOTSTRAP_ADMIN_*` variables in docker-compose.yml.
**Warning signs:** 401 when accessing Keycloak admin console.

### Pitfall 5: Keycloak Roles Not in JWT
**What goes wrong:** JWT tokens don't contain role information. Guards always deny.
**Why it happens:** Client scope mappers need "Add to access token" enabled. By default, some mappers only add to ID token.
**How to avoid:** In the Keycloak realm export JSON, ensure the `realm-management` and `account` client scopes have mappers with `"claim.name": "realm_access"` and `"access.token.claim": "true"`.
**Warning signs:** Decoded JWT shows no `realm_access` or `resource_access` claims.

### Pitfall 6: Multi-Role Permission Union Logic (D-04)
**What goes wrong:** User with both Lehrer + Elternteil roles gets only one role's permissions.
**Why it happens:** Loading permissions for only one role, or using "first match" instead of union.
**How to avoid:** CASL ability factory must query permissions for ALL user roles (`{ role: { name: { in: user.roles } } }`) and build abilities from the combined set.
**Warning signs:** Teacher who is also a parent can't see their child's grades.

### Pitfall 7: Audit Trail Performance with Prisma Extensions
**What goes wrong:** Every mutation query becomes 2x slower because it's wrapped in a transaction.
**Why it happens:** The Prisma extension wraps each mutation in `$transaction` to set `app.current_user_id` via `set_config`.
**How to avoid:** (1) Only wrap mutations, not reads. (2) Use PostgreSQL triggers for the actual audit logging, not application-level inserts. (3) Consider batching audit writes via a background queue for high-throughput scenarios.
**Warning signs:** P95 latency doubling on write endpoints.

### Pitfall 8: @nestjs/swagger with Fastify Adapter
**What goes wrong:** Swagger UI doesn't load, or CORS issues with OAuth2 flow.
**Why it happens:** Swagger static assets need explicit Fastify static file serving. CORS config differs between Express and Fastify adapters.
**How to avoid:** Install `@fastify/static` (peer dependency of `@nestjs/platform-fastify`). Enable CORS explicitly in the Fastify adapter.
**Warning signs:** 404 on `/api/docs` or blank Swagger page.

## Code Examples

### Prisma Schema for School Profile (FOUND-01, D-08 through D-11)

```prisma
// prisma/schema.prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/config/database/generated"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}

enum SchoolType {
  VS        // Volksschule
  MS        // Mittelschule
  AHS_UNTER // AHS Unterstufe
  AHS_OBER  // AHS Oberstufe
  BHS       // Berufsbildende hoehere Schule
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
}

model School {
  id          String     @id @default(uuid())
  name        String
  schoolType  SchoolType @map("school_type")
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  timeGrid    TimeGrid?
  schoolYear  SchoolYear?
  schoolDays  SchoolDay[]

  @@map("schools")
}

model TimeGrid {
  id        String   @id @default(uuid())
  schoolId  String   @unique @map("school_id")
  school    School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  periods   Period[]

  @@map("time_grids")
}

model Period {
  id          String   @id @default(uuid())
  timeGridId  String   @map("time_grid_id")
  timeGrid    TimeGrid @relation(fields: [timeGridId], references: [id], onDelete: Cascade)

  periodNumber Int     @map("period_number")
  startTime    String  // "08:00" -- stored as HH:mm
  endTime      String  // "08:50"
  isBreak      Boolean @default(false) @map("is_break")
  label        String? // "1. Stunde", "Grosse Pause"
  durationMin  Int     @map("duration_min")

  @@unique([timeGridId, periodNumber])
  @@map("periods")
}

model SchoolDay {
  id        String    @id @default(uuid())
  schoolId  String    @map("school_id")
  school    School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  dayOfWeek DayOfWeek @map("day_of_week")
  isActive  Boolean   @default(true) @map("is_active")

  @@unique([schoolId, dayOfWeek])
  @@map("school_days")
}

model SchoolYear {
  id              String   @id @default(uuid())
  schoolId        String   @unique @map("school_id")
  school          School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  name            String   // "2026/2027"
  startDate       DateTime @map("start_date")
  semesterBreak   DateTime @map("semester_break")
  endDate         DateTime @map("end_date")

  holidays        Holiday[]
  autonomousDays  AutonomousDay[]

  @@map("school_years")
}

model Holiday {
  id            String     @id @default(uuid())
  schoolYearId  String     @map("school_year_id")
  schoolYear    SchoolYear @relation(fields: [schoolYearId], references: [id], onDelete: Cascade)

  name          String     // "Herbstferien", "Weihnachtsferien"
  startDate     DateTime   @map("start_date")
  endDate       DateTime   @map("end_date")

  @@map("holidays")
}

model AutonomousDay {
  id            String     @id @default(uuid())
  schoolYearId  String     @map("school_year_id")
  schoolYear    SchoolYear @relation(fields: [schoolYearId], references: [id], onDelete: Cascade)

  date          DateTime
  reason        String?

  @@map("autonomous_days")
}

// --- RBAC + ACL (D-01, D-02, D-04) ---

model Role {
  id          String       @id @default(uuid())
  name        String       @unique // admin, schulleitung, lehrer, eltern, schueler
  displayName String       @map("display_name") // German display name
  description String?

  permissions Permission[]
  userRoles   UserRole[]

  @@map("roles")
}

model Permission {
  id         String   @id @default(uuid())
  roleId     String   @map("role_id")
  role       Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)

  action     String   // "create", "read", "update", "delete", "manage"
  subject    String   // "school", "timetable", "classbook", "grades", "all"
  conditions Json?    // { "userId": "{{ id }}" }
  inverted   Boolean  @default(false)
  reason     String?

  @@map("permissions")
}

model PermissionOverride {
  id         String   @id @default(uuid())
  userId     String   @map("user_id") // Keycloak user ID
  action     String
  subject    String
  conditions Json?
  granted    Boolean  @default(true) // true = grant, false = deny
  grantedBy  String   @map("granted_by") // Admin who set the override
  createdAt  DateTime @default(now()) @map("created_at")

  @@unique([userId, action, subject])
  @@map("permission_overrides")
}

model UserRole {
  id       String @id @default(uuid())
  userId   String @map("user_id") // Keycloak user ID
  roleId   String @map("role_id")
  role     Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([userId, roleId])
  @@map("user_roles")
}

// --- Audit Trail (D-05, D-06, D-07) ---

enum AuditCategory {
  MUTATION       // All writes
  SENSITIVE_READ // Grades, personal data, health data
}

model AuditEntry {
  id            String        @id @default(uuid())
  userId        String        @map("user_id")
  action        String        // "create", "update", "delete", "read"
  resource      String        // "school", "grades", "student"
  resourceId    String?       @map("resource_id")
  category      AuditCategory
  metadata      Json?         // Request body, changed fields
  ipAddress     String?       @map("ip_address")
  userAgent     String?       @map("user_agent")
  createdAt     DateTime      @default(now()) @map("created_at")

  @@index([userId])
  @@index([resource, resourceId])
  @@index([createdAt])
  @@index([category])
  @@map("audit_entries")
}
```

### Keycloak Docker Compose Service

```yaml
# docker/docker-compose.yml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_DB: schoolflow
      POSTGRES_USER: schoolflow
      POSTGRES_PASSWORD: schoolflow_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U schoolflow"]
      interval: 5s
      timeout: 5s
      retries: 5

  keycloak-db:
    image: postgres:17
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: keycloak_dev
    volumes:
      - keycloak_db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U keycloak"]
      interval: 5s
      timeout: 5s
      retries: 5

  keycloak:
    image: quay.io/keycloak/keycloak:26.5.6
    command: start-dev --import-realm
    environment:
      KC_BOOTSTRAP_ADMIN_USERNAME: admin
      KC_BOOTSTRAP_ADMIN_PASSWORD: admin
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://keycloak-db:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: keycloak_dev
      KC_HOSTNAME: localhost
      KC_HOSTNAME_PORT: 8080
      KC_HTTP_ENABLED: "true"
      KC_HOSTNAME_STRICT: "false"
    ports:
      - "8080:8080"
    volumes:
      - ./keycloak/realm-export.json:/opt/keycloak/data/import/realm-export.json
    depends_on:
      keycloak-db:
        condition: service_healthy

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ..
      dockerfile: apps/api/Dockerfile
    environment:
      DATABASE_URL: postgresql://schoolflow:schoolflow_dev@postgres:5432/schoolflow
      REDIS_URL: redis://redis:6379
      KEYCLOAK_URL: http://keycloak:8080
      KEYCLOAK_REALM: schoolflow
      KEYCLOAK_CLIENT_ID: schoolflow-api
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      keycloak:
        condition: service_started

volumes:
  postgres_data:
  keycloak_db_data:
```

### Pagination DTO (D-14)

```typescript
// apps/api/src/common/dto/pagination.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

export class PaginatedResponseDto<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma Rust engine | Prisma pure TypeScript + driver adapters | Prisma 7 (Dec 2025) | 3x faster queries, 90% smaller bundle, but requires explicit adapter setup |
| `prisma-client-js` generator | `prisma-client` generator | Prisma 7 | Output to custom path required, `moduleFormat = "cjs"` for NestJS |
| `url` in schema.prisma datasource | `prisma.config.ts` file | Prisma 7 | DB URL now in TypeScript config file |
| Prisma `$use()` middleware | Prisma client extensions | Prisma 4.16.0+ (removed 6.14.0) | Middleware deprecated. Extensions have full type safety. |
| `KEYCLOAK_ADMIN` env var | `KC_BOOTSTRAP_ADMIN_USERNAME` | Keycloak 26 | Old env vars no longer work |
| NestJS Express adapter | NestJS Fastify adapter | Ongoing | Better performance, but different middleware API |
| NestJS Jest default | NestJS Vitest + SWC default | NestJS 11 | Faster tests, native ESM support |
| nest-keycloak-connect | Custom Passport-JWT + jwks-rsa | 2025 (NestJS 11 compat issue) | nest-keycloak-connect v1.x has peer dep issues with NestJS 11 |

**Deprecated/outdated:**
- `nest-keycloak-connect` v1.10.1: Peer dependency `"@nestjs/core": ">=6.0.0 <11.0.0"`. GitHub Issue #197 open.
- `Prisma.$use()` middleware: Removed in Prisma 6.14.0. Use client extensions.
- `KEYCLOAK_ADMIN` env var: Replaced by `KC_BOOTSTRAP_ADMIN_USERNAME` in Keycloak 26.

## Open Questions

1. **Keycloak realm-export.json scope for Phase 1**
   - What we know: We need a realm with 5 realm roles, one client (schoolflow-api), and proper mappers for JWT role claims.
   - What's unclear: Whether to also include LDAP federation config in Phase 1 or defer to a later phase.
   - Recommendation: Create realm with roles and client only. LDAP/AD federation is a deployment concern, not a Phase 1 requirement.

2. **Prisma 7 + Fastify + @sjfrhafe/nest-problem-details compatibility**
   - What we know: Each library works individually with NestJS 11.
   - What's unclear: Whether the problem-details filter handles Fastify-specific error types correctly.
   - Recommendation: LOW risk. Test during implementation. If incompatible, the RFC 9457 filter is straightforward to hand-write as a fallback.

3. **CASL permission caching strategy**
   - What we know: Loading permissions from DB on every request has latency cost.
   - What's unclear: Optimal caching duration for permissions (they can be changed by admins at any time per D-02).
   - Recommendation: Cache abilities per user in Redis with a short TTL (30-60 seconds). Invalidate on permission change. Acceptable trade-off between freshness and performance.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes (but wrong version) | 25.8.2 (need 24 LTS) | Use nvm/fnm to install Node 24 LTS. v25 is Current, not LTS. |
| pnpm | Package manager | No | -- | `npm install -g pnpm@10` or `corepack enable` |
| Docker | Containerization | Yes | 29.2.0 | -- |
| Docker Compose | Dev environment | Yes | 5.0.2 | -- |
| Java 21 | Timefold (NOT Phase 1) | No (Java 11 installed) | 11.0.11 | Not needed for Phase 1. Timefold is Phase 3. |
| Turborepo | Build orchestration | No | -- | `pnpm add -D turbo` as workspace devDep |
| PostgreSQL | Database | Via Docker | 17 (container) | -- |
| Redis | Cache/queue | Via Docker | 7 (container) | -- |
| Keycloak | Auth | Via Docker | 26.5.6 (container) | -- |

**Missing dependencies with no fallback:**
- pnpm must be installed globally before monorepo setup (required by workspace protocol)

**Missing dependencies with fallback:**
- Node.js 25.8.2 is installed (Current track), but CLAUDE.md specifies Node 24 LTS. NestJS 11 works with both, but LTS is recommended for stability. Can proceed with v25 or install v24 via nvm.
- Turborepo is installed as a workspace devDependency, not globally.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 (NestJS 11 default) |
| Config file | None -- Wave 0 must create `vitest.config.ts` |
| Quick run command | `pnpm --filter api test -- --run` |
| Full suite command | `pnpm turbo test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Create school profile with name, type, time grid, school days | integration | `vitest run src/modules/school/school.service.spec.ts` | Wave 0 |
| AUTH-01 | 5 standard roles recognized and enforced | unit | `vitest run src/modules/auth/casl/casl-ability.factory.spec.ts` | Wave 0 |
| AUTH-02 | Per-module granular permissions configurable | unit + integration | `vitest run src/modules/auth/casl/` | Wave 0 |
| AUTH-03 | Data visibility scoped by role (parent sees only child) | integration | `vitest run src/modules/auth/guards/permissions.guard.spec.ts` | Wave 0 |
| AUTH-04 | Audit trail logs mutations and sensitive reads | integration | `vitest run src/modules/audit/audit.interceptor.spec.ts` | Wave 0 |
| AUTH-05 | Keycloak OIDC authentication works | integration | `vitest run src/modules/auth/strategies/keycloak-jwt.strategy.spec.ts` | Wave 0 |
| AUTH-06 | Session survives browser refresh | manual-only | Manual: login, refresh browser, verify still authenticated | -- |
| DEPLOY-01 | docker compose up starts all services | smoke | `docker compose -f docker/docker-compose.yml up -d && curl -f http://localhost:3000/api/v1/health` | Wave 0 |
| API-01 | All functions available via REST | integration | `vitest run src/modules/school/school.controller.spec.ts` (Supertest) | Wave 0 |
| API-02 | Swagger docs auto-generated | smoke | `curl -f http://localhost:3000/api/docs-json` | Wave 0 |
| API-03 | OAuth2/OIDC token auth on all endpoints | integration | `vitest run src/modules/auth/guards/jwt-auth.guard.spec.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter api test -- --run`
- **Per wave merge:** `pnpm turbo test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/vitest.config.ts` -- Vitest configuration for NestJS + SWC
- [ ] `apps/api/src/modules/auth/casl/casl-ability.factory.spec.ts` -- covers AUTH-01, AUTH-02
- [ ] `apps/api/src/modules/auth/guards/permissions.guard.spec.ts` -- covers AUTH-03
- [ ] `apps/api/src/modules/auth/guards/jwt-auth.guard.spec.ts` -- covers AUTH-05, API-03
- [ ] `apps/api/src/modules/auth/strategies/keycloak-jwt.strategy.spec.ts` -- covers AUTH-05
- [ ] `apps/api/src/modules/audit/audit.interceptor.spec.ts` -- covers AUTH-04
- [ ] `apps/api/src/modules/school/school.service.spec.ts` -- covers FOUND-01
- [ ] `apps/api/src/modules/school/school.controller.spec.ts` -- covers API-01 (Supertest)
- [ ] `apps/api/test/app.e2e-spec.ts` -- smoke test for DEPLOY-01, API-02
- [ ] Framework install: `pnpm add -D vitest @vitest/coverage-v8 @swc/core unplugin-swc`

## Sources

### Primary (HIGH confidence)
- npm registry -- verified all package versions via `npm view [package] version` on 2026-03-29
- [NestJS 11 announcement (Trilon)](https://trilon.io/blog/announcing-nestjs-11-whats-new) -- SWC default, Vitest default, module perf
- [Prisma 7 release blog](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0) -- Rust-free, driver adapters, new config
- [Prisma 7 NestJS upgrade guide (Martin Gregersen)](https://mgregersen.dk/upgrading-prisma-to-rust-free-client-in-nestjs/) -- Step-by-step PrismaService, moduleFormat cjs, prisma.config.ts
- [Prisma client extensions docs](https://www.prisma.io/docs/orm/prisma-client/client-extensions) -- Query extensions replacing middleware
- [Prisma audit-log-context example](https://github.com/prisma/prisma-client-extensions/tree/main/audit-log-context) -- Official audit pattern with PostgreSQL triggers
- [NestJS OpenAPI Security docs](https://docs.nestjs.com/openapi/security) -- OAuth2, BearerAuth decorators
- [NestJS Authorization docs](https://docs.nestjs.com/security/authorization) -- CASL integration, guard patterns
- [Keycloak getting started Docker](https://www.keycloak.org/getting-started/getting-started-docker) -- Docker setup, realm import
- [Keycloak container docs](https://www.keycloak.org/server/containers) -- KC_BOOTSTRAP_ADMIN env vars
- [nest-keycloak-connect Issue #197](https://github.com/ferrerojosh/nest-keycloak-connect/issues/197) -- NestJS 11 peer dep incompatibility
- [NestJS Keycloak Complete Guide (SkyCloak)](https://skycloak.io/blog/keycloak-nestjs-authentication-guide/) -- Custom Passport JWT + nest-keycloak-connect comparison

### Secondary (MEDIUM confidence)
- [CASL persisted permissions NestJS (Medium)](https://medium.com/yavar/casl-roles-with-persisted-permissions-in-nestjs-152129f4a6fb) -- DB schema, ability factory, conditions templating
- [pnpm Turborepo NestJS monorepo setup (Medium)](https://medium.com/@chengchao60827/how-to-setup-a-monorepo-project-using-nextjs-nestjs-turborepo-and-pnpm-e0d3ade0360d) -- Monorepo structure
- [@sjfrhafe/nest-problem-details (npm)](https://www.npmjs.com/package/@sjfrhafe/nest-problem-details) -- RFC 9457 filter
- [NestJS audit trail patterns (Medium)](https://medium.com/@usottah/building-a-comprehensive-audit-system-in-nestjs-and-express-js-b34af8588f58) -- Interceptor-based audit logging

### Tertiary (LOW confidence)
- Prisma 7 + NestJS `$transaction` behavior with client extensions -- the official example warns about limitations with explicit transactions. Needs validation during implementation.
- `@sjfrhafe/nest-problem-details` Fastify compatibility -- not explicitly documented with Fastify adapter. Needs testing.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against npm registry on 2026-03-29, compatibility confirmed via multiple sources
- Architecture: HIGH -- patterns sourced from official docs and battle-tested community implementations
- Pitfalls: HIGH -- each pitfall confirmed by official docs, changelogs, or GitHub issues
- Keycloak integration: HIGH -- two verified approaches (custom JWT vs nest-keycloak-connect), clear recommendation based on NestJS 11 compatibility evidence
- CASL + ACL pattern: MEDIUM -- community articles confirm the pattern works, but the specific D-01/D-02 requirements (admin-configurable ACL overrides at runtime) need custom implementation on top of CASL

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (30 days -- stack is stable, no expected breaking changes)
