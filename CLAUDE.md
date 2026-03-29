<!-- GSD:project-start source:PROJECT.md -->
## Project

**OpenAustria SchoolFlow**

Eine Open-Source-Plattform zur Verwaltung von Schulen im DACH-Raum — die freie Alternative zu Untis. SchoolFlow bietet automatische Stundenplanerstellung, digitales Klassenbuch, und schulinterne Kommunikation mit modernem, responsivem UI auf Web und Mobile. Gebaut für alle Schultypen von der Volksschule bis zur BHS.

**Core Value:** Schulen bekommen eine moderne, erweiterbare Plattform mit automatischer Stundenplanerstellung, die sie selbst hosten können — ohne Vendor Lock-in, mit offenen APIs und DSGVO-Konformität von Tag 1.

### Constraints

- **Architektur**: Monorepo mit klar getrennten Services und internen APIs — UI-Client muss austauschbar sein ohne Backend-Änderungen
- **Framework-Unabhängigkeit**: Kein Lock-in auf ein spezifisches Framework — "best tool for the job" mit Fokus auf Performance und Modularität
- **DSGVO**: Konformität von Tag 1 — kein nachträgliches Retrofitting
- **Deployment**: Single-Tenant, Self-Hosted via Docker/Kubernetes als Default-Deployment
- **Lizenz**: Open Source (Lizenztyp noch zu entscheiden — MIT, AGPL, oder Apache 2.0)
- **Plattformen**: Web (responsive) + Mobile (native oder cross-platform) mit Feature-Parität
- **API-First**: Alle Funktionen über API verfügbar — UI ist nur ein Consumer
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Runtime & Language
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Node.js | 24 LTS (Krypton) | Server runtime | Current Active LTS, supported until 2028-04. Largest ecosystem for API-first TypeScript services. | HIGH |
| TypeScript | 6.0 | Language | Released 2026-03-23. Last JS-based compiler release before the Go-native TS 7.0. Stable, well-understood tooling. Do NOT jump to TS 7.0 native preview yet -- it is pre-release. | HIGH |
| Java 21 LTS | 21 | Constraint solver runtime | Required for Timefold Solver (Java/Kotlin). Python port runs at ~25% of Java throughput -- unacceptable for NP-hard timetabling. Java 21 is the current LTS with virtual threads. | HIGH |
- The project requires a large contributor base (open-source, DACH school community). TypeScript has 10x the developer pool vs Go or Rust.
- Web + Mobile (React Native) share TypeScript. One language across frontend, backend, and mobile eliminates context-switching.
- NestJS provides the modular, enterprise-grade architecture the project demands.
- Performance is sufficient -- this is a school management platform, not a high-frequency trading system. The constraint solver (the only CPU-bound component) runs on the JVM anyway.
- Go: Lacks the decorator/DI patterns needed for a modular plugin architecture. Fewer ORM options. No shared language with frontend.
- Rust: Development velocity is 2-3x slower. Overkill for CRUD-heavy school management. Tiny contributor pool for open-source education software.
### Core Backend Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| NestJS | 11.x (~11.1) | API framework | Modular architecture with DI, decorators, guards, interceptors. Built-in support for GraphQL, WebSockets, queues, CQRS. Series A funded, maintained until 2030+. Native Prisma support since v10. | HIGH |
| Alternative | Why Not |
|-------------|---------|
| Fastify (raw) | No built-in module system, DI, or guards. You would re-implement half of NestJS. NestJS can use Fastify as its HTTP adapter anyway. |
| Hono | Designed for edge/serverless. No DI, no module system, no WebSocket support out-of-box. Wrong tool for a self-hosted monolith. |
| Express | Legacy. No TypeScript-first design. No built-in structure for large codebases. |
| Koa | Minimal, no batteries. Same problem as raw Fastify. |
### Database
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 17.x (17.9) | Primary database | Industry standard for complex relational data. Superior JSONB support for flexible schema fields (school-type-specific data). Row-level security for DSGVO. Full-text search for German-language content. Most desired DB among developers in 2025/2026. | HIGH |
| Redis | 7.x | Cache, sessions, queues | Required by BullMQ for job queues (timetable generation). Caches frequently-read data (timetables, room availability). Pub/sub for real-time events across service instances. | HIGH |
### ORM / Database Access
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Prisma | 7.x | ORM, migrations, schema | Prisma 7 (late 2025) removed the Rust engine -- pure TypeScript now. Up to 3.4x faster queries, 9x faster cold starts. Schema-first design catches errors at build time. Native NestJS integration. Best migration tooling in the TypeScript ecosystem. | HIGH |
- Prisma's schema-first approach is better for a large team where the database schema IS the contract between services. Schema changes are explicit, reviewed, and versioned.
- Drizzle is code-first -- excellent for solo developers who want SQL control, but risky for open-source projects where contributors need guardrails.
- Prisma 7's architecture rewrite eliminated the historical performance gap. The Rust engine overhead is gone.
- Prisma has superior introspection for existing databases (useful when schools migrate from legacy systems).
### API Layer
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| REST (NestJS controllers) | -- | Public API, CRUD operations | Simple, cacheable, well-understood. OpenAPI/Swagger generation built into NestJS. External integrations (MS Teams, Google Calendar) expect REST. | HIGH |
| GraphQL (NestJS + Apollo) | Apollo Server 4.x | Internal frontend queries | Flexible data fetching for complex UI views (timetable week view needs teacher + room + class + subject in one query). Eliminates over-fetching on mobile. Code-first schema generation from TypeScript decorators. | MEDIUM |
- All business logic lives behind REST endpoints.
- GraphQL gateway aggregates REST responses for frontend consumption.
- External consumers (plugin system, third-party integrations) use REST exclusively.
- This avoids the "GraphQL monolith" anti-pattern where business logic leaks into resolvers.
### Constraint Solver (Timetabling Engine)
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Timefold Solver | 1.32.0 (stable) | Automatic timetable generation | Purpose-built for school timetabling (official quickstart exists). Fork of OptaPlanner with active development. Constraint Streams API is declarative and readable. Integrates with Spring Boot/Quarkus for REST API exposure. Open source (Apache 2.0). | HIGH |
- The Timefold solver runs as a separate Java/Kotlin microservice with its own REST API.
- The NestJS backend calls the solver service asynchronously via BullMQ job queue.
- Results are stored in PostgreSQL and pushed to clients via WebSocket.
- This cleanly separates the JVM dependency from the Node.js stack.
| Alternative | Why Not |
|-------------|---------|
| Google OR-Tools CP-SAT (v9.15) | Lower-level API. You must model the entire timetabling problem from scratch. No school-timetabling quickstart. Excellent solver, but more work to integrate. Good fallback if Timefold's license changes. |
| Choco Solver | Academic focus. Less documentation. No built-in REST integration. Smaller community. |
| Custom GA/SA implementation | 6-12 months of algorithm development before you can even test it. Timefold gives you a working prototype in days. |
| Timefold Python | ~25% of Java throughput. Unacceptable for schools with 1000+ students and complex constraints. |
### Authentication & Authorization
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Keycloak | 26.5.x (26.5.6) | Identity provider, SSO, OIDC | Enterprise-grade. Supports OIDC, SAML, LDAP federation (schools often have Active Directory). Fine-grained role mapping (Admin, Schulleitung, Lehrer, Eltern, Schueler). Red Hat backed. Proven in education sector. Self-hosted. | HIGH |
| Alternative | Why Not |
|-------------|---------|
| Authentik | Cleaner UI, but smaller community. Less LDAP/AD federation maturity. Schools in DACH often have Microsoft AD -- Keycloak handles this natively. |
| Ory (Kratos/Hydra/Keto) | Modular but complex to wire together. Requires deep identity expertise. Overkill for a project that needs "just works" auth. |
| Authelia | Reverse-proxy focused. Not a full identity provider. No user management UI. |
| Build custom auth | Never. Authentication is a solved problem. Rolling your own violates DSGVO audit requirements. |
- Keycloak manages identity (who are you?) and authentication (prove it).
- Application-level RBAC (what can you do?) lives in the NestJS backend using NestJS Guards + a custom permission system.
- Keycloak provides JWT tokens; the backend validates and maps roles to permissions.
### Real-Time Communication
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Socket.IO (via @nestjs/websockets) | 4.x | Real-time push notifications, timetable updates, messaging | Built-in reconnection, rooms (per-class, per-teacher), namespaces, broadcasting. Native NestJS integration. Fallback to long-polling when WebSocket is blocked (common in school networks behind proxies). | HIGH |
- School networks are notoriously restrictive. Socket.IO's automatic fallback to HTTP long-polling is essential.
- Rooms map naturally to school concepts: a room per class, per teacher, per parent group.
- Broadcasting timetable changes to all affected parties is a first-class feature.
- SSE is server-to-client only. The messaging feature (Lehrer-Eltern communication) requires bidirectional communication.
- SSE lacks rooms/namespaces -- you would need to build your own multiplexing.
### Job Queue & Background Processing
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| BullMQ | 5.x | Async job processing | Timetable generation jobs (long-running, 30s-5min). Notification delivery. Report generation. DSGVO data export/deletion jobs. Native NestJS integration via @nestjs/bullmq. Redis-backed for persistence and horizontal scaling. | HIGH |
### Frontend Web
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React | 19.x (19.2.1) | UI library | Largest ecosystem. Best hiring pool. shadcn/ui component library. Shares mental model with React Native for mobile. | HIGH |
| Vite | 6.x | Build tool, dev server | Sub-second HMR. Native ESM. Faster than Webpack by 10-20x. | HIGH |
| TanStack Query | 5.x (5.95) | Server state management | Caching, deduplication, background refetching. Suspense support. Replaces manual fetch+useState patterns. | HIGH |
| TanStack Router | 1.x | Routing | Type-safe routing with search params. File-based route generation. Better than React Router for large apps. | MEDIUM |
| shadcn/ui + Radix UI | Latest | Component library | Copy-paste components you own. Accessible by default. Tailwind CSS styling. No version lock-in. Currently transitioning to Base UI foundation -- monitor this. | MEDIUM |
| Tailwind CSS | 4.x | Styling | Utility-first. Consistent design system. Smaller bundle than CSS-in-JS. Excellent with shadcn/ui. | HIGH |
| Zustand | 5.x | Client state | Lightweight global state for UI concerns (sidebar open, theme). NOT for server state (that is TanStack Query). | HIGH |
- The frontend is a SPA consuming an API. It does NOT need SSR, SSG, or server components.
- Next.js adds Vercel-oriented complexity (app router, server actions) that conflicts with the "UI-agnostic backend" constraint.
- The backend IS the server. Adding a frontend framework server creates deployment complexity for self-hosted schools.
- A plain React SPA (Vite + React + TanStack) is the simplest thing that works and can be served as static files from any web server.
### Mobile
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React Native + Expo | SDK 55 (RN 0.83) | Cross-platform mobile app | Officially recommended way to build React Native apps. New Architecture (JSI, Fabric, TurboModules) enabled by default -- near-native performance. Shares TypeScript, TanStack Query, and business logic with web. 3:1 hiring advantage over Flutter. EAS Build for CI/CD. | HIGH |
- Dart is a separate language. No code sharing with the TypeScript web frontend.
- Custom rendering engine means the app does NOT look native on iOS/Android -- bad for a school app where parents expect platform-native UX.
- Smaller hiring pool in the DACH region.
- 2x development cost. Feature parity requires synchronizing two codebases.
- Single TypeScript team can maintain web + mobile.
- `packages/shared` in the monorepo contains API types, validation schemas (Zod), and business logic.
- Both web (React) and mobile (React Native) import from `packages/shared`.
- UI components are NOT shared -- web uses shadcn/ui, mobile uses React Native components.
### Monorepo & Build System
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| pnpm | 10.x (10.33) | Package manager | Strict dependency isolation (no phantom deps). Content-addressable storage saves disk. Workspace protocol for internal packages. Fastest install times. | HIGH |
| Turborepo | 2.8.x (2.8.20) | Build orchestration | Task caching (30s builds become 0.2s). Parallel task execution. Package graph awareness. Lower config overhead than Nx. Written in Rust. | HIGH |
### Testing
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vitest | 4.x (4.1.2) | Unit & integration tests | Native ESM, Vite-powered. 2-5x faster than Jest. Compatible API (describe/it/expect). Browser mode for component tests. | HIGH |
| Playwright | 1.x | E2E tests | Cross-browser. Auto-waiting. Trace viewer for debugging. Official NestJS E2E testing recommendation. | HIGH |
| Supertest | 7.x | API integration tests | HTTP assertions for NestJS controllers. Lightweight. | HIGH |
### Infrastructure & Deployment
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Docker | 27.x | Containerization | Each service (api, solver, web, postgres, redis, keycloak) as a container. Reproducible deployments for schools. | HIGH |
| Docker Compose | 2.x | Local dev & simple deployment | Single `docker compose up` for the entire stack. Perfect for single-school self-hosting. | HIGH |
| Kubernetes (Helm) | 1.30+ | Scaled deployment | For Landesschulraete or hosting providers managing multiple schools. NOT required for v1. | LOW |
### Observability
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| OpenTelemetry | 1.x | Tracing, metrics | Vendor-neutral. Keycloak 26.5 already supports it. NestJS has official @opentelemetry/instrumentation-nestjs. Traces flow across NestJS -> Timefold solver -> PostgreSQL. | MEDIUM |
| Pino | 9.x | Logging | Structured JSON logging. Fastest Node.js logger. NestJS integration via nestjs-pino. | HIGH |
### DSGVO / Compliance
| Technology | Purpose | Notes |
|------------|---------|-------|
| PostgreSQL Row-Level Security | Data isolation per tenant/role | Built-in, no extra dependency |
| Prisma middleware | Audit trail logging | Intercept all writes, log to audit table |
| Keycloak consent flows | DSGVO consent management | Built-in consent screens for OIDC flows |
| Custom NestJS interceptor | Data export (DSGVO Art. 20) | JSON export of all personal data per user |
| Custom NestJS service | Data deletion (DSGVO Art. 17) | Cascade deletion with audit trail via BullMQ job |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Language | TypeScript | Go | No shared language with frontend. Lacks DI/decorator patterns for modular architecture. |
| Language | TypeScript | Rust | 2-3x slower development. Tiny OSS contributor pool. Overkill for CRUD. |
| Backend | NestJS 11 | Fastify (raw) | No module system, DI, or guards. Would re-implement NestJS features. |
| Backend | NestJS 11 | Hono | Edge-focused. No DI. Wrong tool for self-hosted monolith. |
| Database | PostgreSQL 17 | MySQL 8.4 | Weaker JSONB, no RLS, fewer data types. Schools need complex reporting. |
| Database | PostgreSQL 17 | MongoDB | Relational data needs referential integrity. DSGVO cascades require FK constraints. |
| ORM | Prisma 7 | Drizzle | Code-first is risky for OSS with many contributors. Schema-first provides guardrails. |
| ORM | Prisma 7 | TypeORM | Maintenance mode. Active Record anti-pattern. |
| Solver | Timefold 1.32 | OR-Tools CP-SAT | Lower-level API. No timetabling quickstart. More implementation effort. |
| Solver | Timefold 1.32 | Custom GA/SA | 6-12 months of R&D before testable. Timefold works in days. |
| Auth | Keycloak 26.5 | Authentik | Less mature LDAP/AD federation. Schools in DACH need AD integration. |
| Auth | Keycloak 26.5 | Ory | Complex multi-service architecture. Requires identity expertise. |
| Frontend | React 19 + Vite | Next.js 16 | SSR/SSG unnecessary for SPA. Adds deployment complexity for self-hosted schools. |
| Frontend | React 19 + Vite | SvelteKit | Smaller ecosystem. Less hiring. No code sharing with React Native. |
| Mobile | Expo SDK 55 | Flutter | Dart is a separate language. No TS code sharing. Custom rendering looks non-native. |
| Monorepo | Turborepo 2.8 | Nx | More complex setup. Generators add overhead for this project size. |
| Testing | Vitest 4 | Jest | CJS-first architecture. ESM compatibility issues. Slower. |
| Realtime | Socket.IO 4 | Raw WebSockets | No fallback for restrictive school networks. No rooms/broadcasting. |
| Queue | BullMQ 5 | Agenda/Bee-Queue | Smaller community. Less NestJS integration. Bull predecessor is deprecated. |
## Installation
# Core backend
# Dev dependencies (backend)
# Frontend web
# Mobile
# Monorepo tooling
## Version Pinning Strategy
| Dependency | Pin Strategy | Rationale |
|------------|-------------|-----------|
| Node.js | `24.x LTS` | Major version pinned, minor updates OK |
| TypeScript | `~6.0` | Patch updates only. TS minor versions can break types. |
| NestJS | `^11.0` | Minor updates OK. Major requires migration guide. |
| Prisma | `^7.0` | Minor updates OK. Run `prisma generate` after updates. |
| React | `^19.0` | Minor updates OK. |
| Expo SDK | `55` | Pin to SDK version. Upgrade per Expo's migration guide. |
| Timefold | `1.32.0` | Pin exact. Solver behavior changes can break timetable quality. |
| PostgreSQL | `17` | Major version pinned. Point releases via Docker image tag. |
## Sources
### Verified (HIGH confidence)
- [NestJS 11 announcement](https://trilon.io/blog/announcing-nestjs-11-whats-new)
- [Timefold Solver GitHub releases](https://github.com/timefoldai/timefold-solver/releases)
- [Timefold school timetabling docs](https://docs.timefold.ai/timefold-solver/latest/quickstart/shared/school-timetabling/school-timetabling-constraints)
- [Timefold Java vs Python performance](https://timefold.ai/blog/java-vs-python-speed)
- [Prisma 7 architecture rewrite](https://www.prisma.io/blog/convergence)
- [Expo SDK 55 release](https://docs.expo.dev/versions/latest/)
- [React 19.2 stable](https://react.dev/blog/2025/10/01/react-19-2)
- [TypeScript 6.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
- [Keycloak 26.5.6 release](https://www.keycloak.org/2026/03/keycloak-2656-released)
- [PostgreSQL 17 release](https://www.postgresql.org/about/news/postgresql-17-released-2936/)
- [Vitest 4.0 release](https://vitest.dev/blog/vitest-4)
- [Turborepo 2.7 blog](https://turborepo.dev/blog/turbo-2-7)
- [BullMQ NestJS docs](https://docs.nestjs.com/techniques/queues)
- [Node.js releases](https://nodejs.org/en/about/previous-releases)
- [pnpm releases](https://github.com/pnpm/pnpm/releases)
- [OR-Tools releases](https://github.com/google/or-tools/releases)
- [TanStack Query v5](https://tanstack.com/query/latest)
### Ecosystem research (MEDIUM confidence)
- [Drizzle vs Prisma comparison 2026](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma)
- [NestJS plugin architecture patterns](https://stateful.com/blog/web-frameworks-plugins-architecture-overview)
- [Keycloak vs Authentik vs Ory comparison](https://blog.elest.io/authentik-vs-authelia-vs-keycloak-choosing-the-right-self-hosted-identity-provider-in-2026/)
- [React Native vs Flutter 2026](https://www.pkgpulse.com/blog/react-native-vs-flutter-vs-expo-2026)
- [shadcn/ui changelog - Base UI transition](https://ui.shadcn.com/docs/changelog)
- [Radix UI maintenance concerns](https://dev.to/mashuktamim/is-your-shadcn-ui-project-at-risk-a-deep-dive-into-radixs-future-45ei)
- [PostgreSQL vs MySQL 2026](https://www.bytebase.com/blog/postgres-vs-mysql/)
- [GraphQL vs REST best practices](https://blog.postman.com/graphql-vs-rest/)
- [Turborepo vs Nx 2026](https://dev.to/dataformathub/turborepo-nx-and-lerna-the-truth-about-monorepo-tooling-in-2026-71)
- [Socket.IO vs WebSockets](https://ably.com/blog/websockets-vs-sse)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
