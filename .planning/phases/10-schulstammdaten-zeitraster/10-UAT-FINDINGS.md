---
phase: 10-schulstammdaten-zeitraster
kind: uat-findings
status: blocking
authored: 2026-04-20
scope_for_closure: 10.1 gap-closure phase
---

# Phase 10 UAT Findings — Blocker für Task 2 Screenshots

Während des Manual-UAT-Checkpoints (Plan 10-06 Task 2) blockieren drei Bugs die Screenshot-Aufnahme. Sie betreffen die fertige Umsetzung, nicht den Scope — Gap-Closure in Phase 10.1.

## Bug 1 — `SchoolTypeDto` Enum-Drift (HIGH)

**Datei:** `apps/api/src/modules/school/dto/create-school.dto.ts`

Die class-validator `@IsEnum(SchoolTypeDto)` akzeptiert nur die alten Phase-2-Werte:

```ts
enum SchoolTypeDto {
  VS = 'VS',
  MS = 'MS',
  AHS_UNTER = 'AHS_UNTER',
  AHS_OBER = 'AHS_OBER',
  BHS = 'BHS',
}
```

Die Prisma-Enum ist per Migration `20260420125701_expand_school_type_enum_for_phase_10` bereits auf 10 Werte erweitert (`VS, MS, AHS_UNTER, AHS_OBER, BHS, NMS, AHS, BMS, PTS, ASO`). Frontend sendet per `@schoolflow/shared` `SCHOOL_TYPES` (7 Werte: `VS, NMS, AHS, BHS, BMS, PTS, ASO`).

**Reproduktion (curl):**
```bash
PUT /api/v1/schools/:id  Body: {"schoolType":"AHS"}
→ 422 "schoolType must be one of the following values: VS, MS, AHS_UNTER, AHS_OBER, BHS"
```

**Fix:**
- `SchoolTypeDto` Enum auf alle 10 Werte erweitern (oder besser: aus `SCHOOL_TYPES` in `@schoolflow/shared` importieren — Single Source of Truth)
- `school.controller.spec.ts` ergänzen um einen Test der `schoolType: 'AHS'` akzeptiert

## Bug 2 — `School.address` Schema-Mismatch + Daten-Korruption (HIGH)

**Dateien:**
- `apps/api/prisma/schema.prisma` — `address String?`
- `apps/api/src/modules/school/dto/create-school.dto.ts` — `@IsString() address?: string`
- `packages/shared/src/types/school.ts` — `address: { street: string; zip: string; city: string }`
- UI-SPEC §3.2 — **3 separate Felder** (Strasse, PLZ, Ort)

Das Frontend sendet ein Objekt, das Backend speichert als String. Das aktuelle `School` in der Dev-DB hat bereits `"address": "[object Object]"` — **Datenkorruption im Seed-School** durch einen vorherigen UI-Save-Versuch.

**Fix-Optionen:**

- **(a) bevorzugt:** neue Migration die `address String?` → `street String?`, `zip String?`, `city String?` aufspaltet, mit Backfill-Step der existierende Strings (wo möglich) auf die 3 Spalten mapt; DTO + SchoolService + seed.ts anpassen. Saubere relationale Speicherung, matcht UI-SPEC §3.
- **(b) alternativ:** `address String?` → `address Json? @db.JsonB`, DTO akzeptiert `{street, zip, city}`, Backfill-Step existiert (aktueller String → `{street: "...", zip: "", city: ""}` oder NULL). Schneller, aber Abfrage-Ergonomie leidet.

In beiden Fällen: corrupted `"[object Object]"` row in `seed-school-bgbrg-musterstadt` muss im Rahmen der Migration aufgeräumt werden (UPDATE vor oder nach der Spalten-Umstellung).

## Bug 3 — Silent Success-Toast bei 4xx (CRITICAL — Datenverlust-Risiko)

**Symptom (User-Beobachtung):** Toggle in jedem Tab, Toast zeigt "Erfolg", nach Reload sind die Daten weg. DevTools Network zeigt einen 4xx-Response.

**Hypothese:** In mindestens einem der useMutation-Hooks feuert `onSuccess` obwohl `mutationFn` geworfen hat — entweder weil `!res.ok`-Check fehlt, oder weil ein inline-Optimistic-Update den Toast vor dem Fehler triggert, oder weil Sonner beide Toasts übereinander legt und der User nur den ersten sieht.

**Verdächtige Stellen** (Phase 10 Scope):
- `apps/web/src/hooks/useSchool.ts` — useUpdateSchool, useCreateSchool
- `apps/web/src/hooks/useSchoolYears.ts` — useCreateSchoolYear, useActivateSchoolYear, useUpdateSchoolYear, useDeleteSchoolYear, useCreateHoliday, useDeleteHoliday, useCreateAutonomousDay, useDeleteAutonomousDay
- `apps/web/src/hooks/useTimeGrid.ts` — useUpdateTimeGrid
- `apps/web/src/components/admin/school-settings/OptionsTab.tsx` — inline updateAbMut

**Fix-Weg:**
1. Browser-DevTools-Session: in jedem Tab die tatsächliche Request + Response + Toast-Reihenfolge beobachten und dokumentieren
2. Jeden useMutation-Hook auf konsequentes `if (!res.ok) throw` in mutationFn auditieren
3. Kein `toast.success` in `mutationFn` (gehört in `onSuccess`)
4. Verify: `onSuccess` läuft NICHT wenn mutationFn wirft (React-Query-Verhalten validieren)
5. Spec-Tests ergänzen: "given mutationFn throws, onSuccess toast does NOT fire"

**Anmerkung:** Bug 1 erzeugt zwangsläufig Bug 3 (422 in Stammdaten → User sieht "Erfolg"). Fix Bug 3 zuerst, damit Bug 1 sichtbar wird, sonst verstecken sich weitere Fehler in anderen Tabs.

## Deferred (niedrigere Priorität — nicht Phase 10.1 kritisch)

- **Keycloak-Auth-Race in Playwright** — Plan 10-06 Task 1 SUMMARY hält das fest; braucht `apps/web/e2e/auth.setup.ts` + `storageState` in playwright.config.ts
- **Double-Prefix Drift** — `CalendarController`, `SisController`, `PushController` haben `/api/v1/api/v1/...` Routen (API-Log zeigt sie beim Boot). Betrifft nicht Phase 10, aber UAT-relevant wenn Calendar/SIS/Push Features getestet werden. Separates Gap-Ticket.

## Dev-Stack-Zustand beim Pausieren

- Docker: `postgres`, `redis`, `keycloak`, `keycloak-db` laufen
- API: `node apps/api/dist/main.js` auf `:3000` (PID-Pidfile nicht gesetzt — vor Neustart `lsof -ti:3000 | xargs kill -9`)
- Vite: `pnpm --filter @schoolflow/web dev` auf `:5173`
- Keycloak-Person-Link: **gefixt** (persons.keycloak_user_id auf echte Keycloak-UUIDs aligned — siehe `reference_app_startup.md` Memory für Details)
- Seed-School `seed-school-bgbrg-musterstadt` hat korruptes `address: "[object Object]"` — Teil des Bug-2-Backfills

## Was schon committed ist

Phase 10 Commits ab `b968d56` (Plan-Commit) bis `431edce` (Plan 10-06 SUMMARY). Wave 1–5 komplett + grün, Wave 6 Task 1 committed (Playwright-Files), Task 2 blockiert durch obige Bugs.

## 10.1 Planungs-Anker

Wenn `/gsd:plan-phase 10.1` läuft:
1. Dieses File als Input nehmen
2. Tasks pro Bug (1, 2, 3) in dieser Reihenfolge lösen — Bug 3 zuerst fixen damit Bugs 1+2 sichtbar werden
3. Acceptance pro Task: eine erweiterte `*.spec.ts` die den Bug-Pfad abdeckt + ein curl-Roundtrip-Beweis im SUMMARY
4. Nach allen drei Fixes: Dev-Stack restart-Sequenz dokumentieren (API rebuild + Vite restart per Memory `feedback_restart_vite.md`), dann Plan 10-06 Task 2 Screenshots fortsetzen
5. Phase 10 erst als "complete" markieren wenn alle 6 Screenshots unter `.planning/phases/10-schulstammdaten-zeitraster/uat-screenshots/` committed sind
