# SchoolFlow

[![Version](https://img.shields.io/badge/version-v1.1--in--progress-blue.svg)](https://github.com/martinvidec/openaustria-school-flow/releases)
[![Tests](https://img.shields.io/badge/tests-754%20api%20%2B%20107%20web-green.svg)](#entwicklung)
[![Status](https://img.shields.io/badge/status-v1.1%20Schuladmin%20Console-success.svg)](.planning/ROADMAP.md)

Open-Source-Schulverwaltungsplattform fuer den DACH-Raum -- die freie Alternative zu Untis.

Automatische Stundenplanerstellung, digitales Klassenbuch, Vertretungsplanung, schulinterne Kommunikation, Hausaufgaben/Pruefungen, Datenimport und Mobile PWA. Gebaut fuer alle Schultypen von der Volksschule bis zur BHS.

**Status:** v1.0 MVP shipped 2026-04-09 (production-ready). v1.1 *Schuladmin Console* in progress -- 13/19 Phasen complete, kompletter Admin-Workflow (Schulstammdaten, Lehrer/Faecher/Klassen, User+Rechte, Solver-Tuning, DSGVO+Audit-Log, Dashboard) plus Mobile-Haertung gelandet auf main.

## Features

### Kernfunktionen
- **Stundenplanerstellung** -- Automatische Generierung optimaler Stundenplaene mit Timefold Constraint Solver (6 harte + 9 weiche Constraints, A/B-Wochen, Doppelstunden)
- **Stundenplan-Ansichten** -- Rollenbasierte Views (Lehrer/Klasse/Raum), Drag-and-Drop-Bearbeitung, PDF/iCal-Export, Echtzeit-Updates
- **Digitales Klassenbuch** -- Anwesenheit, Lehrstoff, Noten (Austrian 1-5 Notensystem), Schuelernotizen, Elternentschuldigungen mit File Upload
- **Vertretungsplanung** -- Automatische Kandidaten-Ranking, Push-Benachrichtigungen, Uebergabenotizen, Fairness-Statistik
- **Kommunikation** -- Thread-basiertes Messaging (direkt, Klasse, Schule), Lesebestaetigungen, Datei-Anhaenge, Umfragen, Abwesenheitsmeldung
- **Hausaufgaben & Pruefungen** -- Zuordnung zu Stunden, Kollisionserkennung, Timetable-Badges, Push-Benachrichtigungen

### Schuladmin-Konsole (v1.1)
- **Dashboard** -- Setup-Completeness-Checkliste, KPI-Cards, Quick-Actions, Recent-Activity-Feed mit Cross-Mutation-Invalidation
- **Schulstammdaten & Zeitraster** -- Schule, Schultyp, Adresse, Schuljahre, Wochentage, Stundenraster mit Pause-Markern
- **Personal & Faecher** -- Lehrerverwaltung mit Lehrverpflichtung + Verfuegbarkeitsgrid, Faecher mit Stundentafel-Vorlagen pro Schultyp
- **Klassen & Schueler** -- Klassen mit Klassenvorstand + Stundentafel + Stammdaten, Schuelerverwaltung, Gruppen mit Auto-Assign-Regeln
- **User & Rechte** -- Keycloak-Mirroring, Rollen-Vergabe, Permission-Overrides, Person-Verknuepfung, Last-Admin-Guard
- **Solver-Tuning** -- 9 Constraint-Gewichtungen mit Slidern + Drift-Banner, Klassen-Sperrzeiten, Fach-Praeferenzen (Vormittag + bevorzugte Slots)
- **DSGVO-Admin** -- Einwilligungen, Aufbewahrungsrichtlinien, DSFA/VVZ, Datenexport-Jobs, Loeschungs-Bestaetigung
- **Audit-Log-Viewer** -- 7-Field-Filter, Before/After-Diff in Drawer, CSV-Export mit UTF-8-BOM + Semicolon-Delimiter
- **Mobile-Haertung** -- 44px Touch-Targets, MobileSidebar-Drawer mit Focus-Management, shared DataList-Primitive (`sm:hidden` als Mobile-Card-Breakpoint)

### Infrastruktur
- **Raumverwaltung** -- Kapazitaeten, Ausstattung, Belegungsplaene, Ad-hoc-Buchung
- **Datenimport** -- Untis XML, CSV mit Column Mapping, Dry-Run-Preview, BullMQ-basiert mit Fortschrittsanzeige
- **iCal-Abonnements** -- Per-User tokenisierte Kalender-URLs fuer Google Calendar, Apple Calendar, Outlook
- **SIS-API** -- Read-only REST-Endpunkte mit API-Key-Authentifizierung fuer externe Systeme
- **Mobile PWA** -- Responsive auf allen Geraeten, Offline-Stundenplan, Web Push Notifications (VAPID per CI-Secret)
- **Production-Ready** -- Backup/Restore-Skripte, Health/Ready-Endpunkte, Docker Compose mit Rolling Updates

### Sicherheit & Compliance
- **Rollensystem** -- Admin, Schulleitung, Lehrer, Eltern, Schueler mit feingranularen CASL-Berechtigungen + per-User Permission-Overrides
- **DSGVO-konform** -- Einwilligungen, Datenexport (Art. 15), Anonymisierung (Art. 17), Aufbewahrungsfristen mit automatischer Loeschung, Audit-Trail von Tag 1, Admin-UI fuer alle DSGVO-Workflows
- **Self-Hosted** -- Kein Vendor Lock-in, vollstaendige Datenhoheit, Keycloak mit LDAP/AD-Federation

## Tech Stack

| Schicht | Technologie |
|---------|-------------|
| **Backend** | NestJS 11, TypeScript 6, Fastify, Prisma 7 |
| **Frontend** | React 19, Vite 8, TanStack Router & Query, Tailwind CSS 4, shadcn/ui |
| **Datenbank** | PostgreSQL 17, Redis 7 |
| **Auth** | Keycloak 26.5 (OIDC, LDAP/AD-Federation) |
| **Solver** | Timefold Solver 1.32 (Java 21, Quarkus) |
| **Realtime** | Socket.IO 4 (6 Namespaces: timetable, classbook, notifications, messaging, import, solver) |
| **Queue** | BullMQ 5 (Jobs: solver, retention, import, push, dsgvo-export) |
| **Mobile** | PWA mit Vite-Plugin-PWA, Workbox, Web Push (VAPID) |
| **Monorepo** | pnpm 10, Turborepo 2.8 |
| **Tests** | Vitest 4, Testing Library, Supertest |

## Projektstruktur

```
openaustria-school-flow/
  apps/
    api/          # NestJS Backend (REST API, WebSockets, BullMQ)
    web/          # React SPA (Vite + TanStack + PWA)
    solver/       # Timefold Timetabling Engine (Java 21 / Quarkus)
  packages/
    shared/       # Gemeinsame Types, DTOs, Enums, Permissions
  docker/
    docker-compose.yml      # Dev: PostgreSQL, Keycloak, Redis, Solver
    docker-compose.prod.yml # Production: Multi-stage builds, resource limits
    scripts/
      backup.sh             # pg_dump + Redis + Uploads backup
      restore.sh            # Restore with integrity verification
  .planning/
    milestones/v1.0-*.md    # v1.0 milestone archive
```

## Voraussetzungen

- **Node.js** >= 24 (LTS)
- **pnpm** >= 10
- **Java** 21 (nur fuer den Solver)
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

Die API laeuft auf `http://localhost:3000`, das Web-Frontend auf `http://localhost:5173`, Keycloak auf `http://localhost:8080`.

### Demo-Accounts (nach Seed)

| Rolle | Username | Passwort |
|-------|----------|----------|
| Admin | `admin` | `admin` |
| Lehrer | `lehrer1` | `lehrer1` |
| Elternteil | `eltern1` | `eltern1` |

## Production Deployment

```bash
# .env konfigurieren
cp docker/.env.example docker/.env
# Secrets, VAPID keys, API_INTERNAL_URL setzen

# Multi-stage Build + Production Stack starten
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d

# Backup
bash docker/scripts/backup.sh

# Restore
bash docker/scripts/restore.sh --latest

# Health Check
curl http://localhost:3000/api/v1/health
curl http://localhost:3000/api/v1/health/ready
```

## Entwicklung

```bash
# Alle Tests ausfuehren
pnpm test

# Nur API-Tests (754 passing, 70 spec files)
cd apps/api && pnpm test

# Nur Web-Tests (107 spec/test files)
cd apps/web && pnpm test

# Playwright E2E (desktop + mobile-chrome)
cd apps/web && pnpm playwright test --project=desktop
cd apps/web && pnpm playwright test --project=mobile-chrome

# Build
pnpm build

# TypeScript-Check
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit -p tsconfig.json
```

### Datenbank-Migrationen

**Hard rule** (siehe [CLAUDE.md](CLAUDE.md)): jede Aenderung an `apps/api/prisma/schema.prisma` MUSS als Migration-File unter `apps/api/prisma/migrations/` shippen. Kein `prisma db push` auf diesem Projekt.

```bash
# Schema-Aenderung -> Migration generieren:
pnpm --filter @schoolflow/api exec prisma migrate dev --name <descriptive>

# Dev-DB komplett neu seeden (z.B. nach UUID-Seed-Rotation):
pnpm --filter @schoolflow/api exec prisma migrate reset --force

# Hygiene-Check (laeuft auch in CI):
bash scripts/check-migration-hygiene.sh
```

## API-Dokumentation

- **Swagger UI:** `http://localhost:3000/api/docs` (wenn API laeuft)
- **OpenAPI JSON:** `http://localhost:3000/api/docs-json`
- **Auth:** OAuth2/OIDC via Keycloak (Bearer Token)

## Milestones

### v1.0 -- MVP (shipped 2026-04-09)

- **12 Phasen** (9 geplant + 3 Gap-Closure), 74 Plaene, 148 Tasks
- **65/65 Anforderungen** erfuellt (100%)
- **423 Backend-Tests** passing
- **~178K LOC** TypeScript + Java
- **6 Socket.IO Namespaces** fuer Echtzeit-Updates
- **Production-ready** Docker Deployment mit Zero-Downtime Rolling Updates

Vollstaendige Milestone-Details in [.planning/milestones/v1.0-ROADMAP.md](.planning/milestones/v1.0-ROADMAP.md).

### v1.1 -- Schuladmin Console (in progress)

13/19 Phasen complete, alles auf `main` gemerged:

| Phase | Inhalt | Status |
|-------|--------|--------|
| 10 + 10.1-10.5 | Schulstammdaten + Zeitraster + E2E-Tranche (Tier 1-3a) | ✓ merged |
| 11 | Lehrer- + Faecher-Verwaltung | ✓ merged |
| 12 | Schueler- + Klassen- + Gruppen-Verwaltung | ✓ merged |
| 13 | User- + Rechte-Verwaltung (Keycloak-Mirror) | ✓ merged |
| 14 | Solver-Tuning (9 Soft-Constraints + Restrictions + Praeferenzen) | ✓ merged |
| 15 + 15.1 | DSGVO-Admin + Audit-Log-Viewer + Seed-UUID-Alignment | ✓ merged |
| 16 | Admin-Dashboard + Mobile-Haertung (44px Touch + DataList-Primitive) | ✓ merged |
| 17 | CI Stabilization (E2E-Failure-Triage) | in flight |
| 18-22 | Verification-Backfill + Cross-Phase-E2E + Tech-Debt-Closure | planned |

**v1.1-Highlights:**
- **754 API-Tests** (Vitest) + **107 Web-Spec-Files** (Vitest + Playwright)
- **Komplette Admin-Workflow-Surfaces** auf desktop + mobile-375
- **Keycloak-Mirror mit Last-Admin-Guard** + per-User Permission-Overrides
- **DSGVO-Admin von Grund auf** (Einwilligungen, Retention, DSFA, VVZ, Export-Jobs, Loeschungs-Confirms)
- **Audit-Log-Viewer mit Before/After-Diff** + RFC-9457-konforme Error-Responses
- **Solver-Tuning UI** mit Drift-Banner + Last-Run-Score-Badge

Vollstaendige Milestone-Details in [.planning/ROADMAP.md](.planning/ROADMAP.md).

## Lizenz

Lizenz wird noch festgelegt (MIT, AGPL, oder Apache 2.0).

## Mitwirken

Beitraege sind willkommen. v1.1-Phasen 17-22 sind aktiv -- siehe [.planning/ROADMAP.md](.planning/ROADMAP.md) und [CLAUDE.md](CLAUDE.md) fuer Workflow-Konventionen (GSD-Phasen-Discipline, Migration-Hygiene, E2E-First).
