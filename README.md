# SchoolFlow

Open-Source-Schulverwaltungsplattform fur den DACH-Raum -- die freie Alternative zu Untis.

Automatische Stundenplanerstellung, digitales Klassenbuch, Vertretungsplanung und schulinterne Kommunikation. Gebaut fur alle Schultypen von der Volksschule bis zur BHS.

## Features

- **Stundenplanerstellung** -- Automatische Generierung optimaler Stundenplane mit Timefold Constraint Solver
- **Digitales Klassenbuch** -- Anwesenheit, Noten, Lehrstoff, Verhaltensbemerkungen
- **Vertretungsplanung** -- Abwesenheiten erfassen, Vertretungen zuweisen, Benachrichtigungen
- **Raumverwaltung** -- Kapazitaten, Ausstattung, Belegungsplane
- **Rollensystem** -- Admin, Schulleitung, Lehrer, Eltern, Schuler mit feingranularen Berechtigungen (CASL)
- **Echtzeit-Updates** -- Stundenplananderungen und Benachrichtigungen via Socket.IO
- **DSGVO-konform** -- Datenschutz von Tag 1, Self-Hosted, kein Vendor Lock-in

## Tech Stack

| Schicht | Technologie |
|---------|-------------|
| **Backend** | NestJS 11, TypeScript 6, Fastify, Prisma 7 |
| **Frontend** | React 19, Vite 8, TanStack Router & Query, Tailwind CSS 4, shadcn/ui |
| **Datenbank** | PostgreSQL 17, Redis 7 |
| **Auth** | Keycloak 26.5 (OIDC, LDAP/AD-Federation) |
| **Solver** | Timefold Solver 1.32 (Java 21, Quarkus) |
| **Queue** | BullMQ 5 |
| **Monorepo** | pnpm 10, Turborepo 2.8 |
| **Tests** | Vitest 4, Testing Library, Supertest |

## Projektstruktur

```
openaustria-school-flow/
  apps/
    api/          # NestJS Backend (REST API, WebSockets, BullMQ)
    web/          # React SPA (Vite + TanStack)
    solver/       # Timefold Timetabling Engine (Java/Quarkus)
  packages/
    shared/       # Gemeinsame Types, Validation Schemas, Business Logic
  docker/
    docker-compose.yml   # PostgreSQL, Keycloak, Redis, Solver
```

## Voraussetzungen

- **Node.js** >= 24 (LTS)
- **pnpm** >= 10
- **Java** 21 (nur fur den Solver)
- **Docker** & Docker Compose

## Schnellstart

```bash
# 1. Repository klonen
git clone https://github.com/martinvidec/openaustria-school-flow.git
cd openaustria-school-flow

# 2. Dependencies installieren
pnpm install

# 3. Infrastruktur starten (PostgreSQL, Keycloak, Redis, Solver)
docker compose -f docker/docker-compose.yml up -d

# 4. Datenbank migrieren und seeden
cd apps/api
npx prisma migrate deploy
npx prisma db seed
cd ../..

# 5. API und Web starten
pnpm dev
```

Die API lauft auf `http://localhost:3000`, das Web-Frontend auf `http://localhost:5173`, Keycloak auf `http://localhost:8080`.

### Demo-Accounts (nach Seed)

| Rolle | Username | Passwort |
|-------|----------|----------|
| Admin | `admin` | `admin` |
| Lehrer | `lehrer1` | `lehrer1` |
| Elternteil | `eltern1` | `eltern1` |

## Entwicklung

```bash
# Alle Tests ausfuhren
pnpm test

# Nur API-Tests
cd apps/api && pnpm test

# Nur Web-Tests
cd apps/web && pnpm test

# Build
pnpm build
```

## API-Dokumentation

Swagger UI ist verfugbar unter `http://localhost:3000/api/docs` wenn die API lauft.

## Lizenz

Lizenz wird noch festgelegt (MIT, AGPL, oder Apache 2.0).

## Mitwirken

Beitrage sind willkommen! Dieses Projekt befindet sich in aktiver Entwicklung.
