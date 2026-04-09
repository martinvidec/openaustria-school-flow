# SchoolFlow

[![Version](https://img.shields.io/badge/version-v1.0-blue.svg)](https://github.com/martinvidec/openaustria-school-flow/releases/tag/v1.0)
[![Tests](https://img.shields.io/badge/tests-423%20passing-green.svg)](#entwicklung)
[![Status](https://img.shields.io/badge/status-MVP%20shipped-success.svg)](.planning/milestones/v1.0-ROADMAP.md)

Open-Source-Schulverwaltungsplattform fur den DACH-Raum -- die freie Alternative zu Untis.

Automatische Stundenplanerstellung, digitales Klassenbuch, Vertretungsplanung, schulinterne Kommunikation, Hausaufgaben/Pruefungen, Datenimport und Mobile PWA. Gebaut fuer alle Schultypen von der Volksschule bis zur BHS.

**Status:** v1.0 MVP shipped 2026-04-09. 65/65 Requirements erfuellt, 423 Tests gruen, production-ready Docker Deployment.

## Features

### Kernfunktionen
- **Stundenplanerstellung** -- Automatische Generierung optimaler Stundenplaene mit Timefold Constraint Solver (6 harte + 8 weiche Constraints, A/B-Wochen, Doppelstunden)
- **Stundenplan-Ansichten** -- Rollenbasierte Views (Lehrer/Klasse/Raum), Drag-and-Drop-Bearbeitung, PDF/iCal-Export, Echtzeit-Updates
- **Digitales Klassenbuch** -- Anwesenheit, Lehrstoff, Noten (Austrian 1-5 Notensystem), Schuelernotizen, Elternentschuldigungen mit File Upload
- **Vertretungsplanung** -- Automatische Kandidaten-Ranking, Push-Benachrichtigungen, Uebergabenotizen, Fairness-Statistik
- **Kommunikation** -- Thread-basiertes Messaging (direkt, Klasse, Schule), Lesebestaetigungen, Datei-Anhaenge, Umfragen, Abwesenheitsmeldung
- **Hausaufgaben & Pruefungen** -- Zuordnung zu Stunden, Kollisionserkennung, Timetable-Badges, Push-Benachrichtigungen

### Infrastruktur
- **Raumverwaltung** -- Kapazitaeten, Ausstattung, Belegungsplaene, Ad-hoc-Buchung
- **Datenimport** -- Untis XML, CSV mit Column Mapping, Dry-Run-Preview, BullMQ-basiert mit Fortschrittsanzeige
- **iCal-Abonnements** -- Per-User tokenisierte Kalender-URLs fuer Google Calendar, Apple Calendar, Outlook
- **SIS-API** -- Read-only REST-Endpunkte mit API-Key-Authentifizierung fuer externe Systeme
- **Mobile PWA** -- Responsive auf allen Geraeten, Offline-Stundenplan, Web Push Notifications
- **Production-Ready** -- Backup/Restore-Skripte, Health/Ready-Endpunkte, Docker Compose mit Rolling Updates

### Sicherheit & Compliance
- **Rollensystem** -- Admin, Schulleitung, Lehrer, Eltern, Schueler mit feingranularen CASL-Berechtigungen
- **DSGVO-konform** -- Einwilligungen, Datenexport (Art. 15), Anonymisierung (Art. 17), Aufbewahrungsfristen mit automatischer Loeschung, Audit-Trail von Tag 1
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
# Alle Tests ausfuehren (423 Tests passing)
pnpm test

# Nur API-Tests
cd apps/api && pnpm test

# Nur Web-Tests
cd apps/web && pnpm test

# Build
pnpm build

# TypeScript-Check
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit -p tsconfig.json
```

## API-Dokumentation

- **Swagger UI:** `http://localhost:3000/api/docs` (wenn API laeuft)
- **OpenAPI JSON:** `http://localhost:3000/api/docs-json`
- **Auth:** OAuth2/OIDC via Keycloak (Bearer Token)

## v1.0 Highlights

- **12 Phasen** (9 geplant + 3 Gap-Closure), 74 Plaene, 148 Tasks
- **65/65 Anforderungen** erfuellt (100%)
- **423 Backend-Tests** passing, 0 Failures
- **~178K LOC** TypeScript + Java
- **6 Socket.IO Namespaces** fuer Echtzeit-Updates
- **Production-ready** Docker Deployment mit Zero-Downtime Rolling Updates

Vollstaendige Milestone-Details in [.planning/milestones/v1.0-ROADMAP.md](.planning/milestones/v1.0-ROADMAP.md).

## Lizenz

Lizenz wird noch festgelegt (MIT, AGPL, oder Apache 2.0).

## Mitwirken

Beitraege sind willkommen! v1.0 ist shipped, v1.1-Planung startet bald.
