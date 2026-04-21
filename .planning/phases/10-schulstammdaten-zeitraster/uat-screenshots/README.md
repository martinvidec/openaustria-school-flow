# Phase 10 UAT Screenshots

Automated UAT artifacts for Phase 10 Schulstammdaten & Zeitraster,
produced by Playwright on every PR to main (via
`.github/workflows/playwright.yml`).

## Filename map

| File                       | Evidence                                              | Captured by                                                           |
| -------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| `SCHOOL-01.png`            | Stammdaten edit-mode with all 5 fields filled         | `apps/web/e2e/screenshots.spec.ts` — SCREENSHOT SCHOOL-01             |
| `SCHOOL-02.png`            | Zeitraster tab, Mo active + PeriodsEditor visible     | `apps/web/e2e/screenshots.spec.ts` — SCREENSHOT SCHOOL-02             |
| `SCHOOL-03.png`            | Schuljahre tab with Info Banner "ist aktiv seit …"    | `apps/web/e2e/screenshots.spec.ts` — SCREENSHOT SCHOOL-03             |
| `SCHOOL-04.png`            | Optionen tab with A/B-Wochen-Modus toggled + banner   | `apps/web/e2e/screenshots.spec.ts` — SCREENSHOT SCHOOL-04             |
| `SCHOOL-05.png`            | Orphan-guard error "wird noch von … verwendet"        | `apps/web/e2e/screenshots.spec.ts` — SCREENSHOT SCHOOL-05             |
| `MOBILE-OVERVIEW.png`      | Mobile 375px landing on `/admin/school/settings`      | `apps/web/e2e/screenshots.mobile.spec.ts` — SCREENSHOT MOBILE-OVERVIEW |

## Regeneration

From the repository root (dev stack must be running):

```bash
cd apps/web
set -a && source ../../.env && set +a
pnpm exec playwright test --grep SCREENSHOT
```

Or per-project:

```bash
# Desktop captures SCHOOL-01..05
pnpm exec playwright test --grep SCREENSHOT --project=desktop

# Mobile captures MOBILE-OVERVIEW
pnpm exec playwright test --grep SCREENSHOT --project=mobile-375
```

## Notes

- `SCHOOL-05.png` is produced by mocking the `DELETE
  /api/v1/schools/:schoolId/school-years/:yearId` endpoint to return HTTP
  409 (see `screenshots.spec.ts` for rationale). The UI rendering and
  German error copy are identical to the real orphan-guard path; the mock
  only replaces the Prisma-direct fixture that is tracked in
  `../../10.2-e2e-admin-console-gap-closure/deferred-items.md` entry #3.
- `MOBILE-OVERVIEW.png` uses the WebKit iPhone 13 device preset via the
  `mobile-375` Playwright project. On macOS <14.7 the frozen WebKit build
  can segfault at launch (see `10.2-e2e-admin-console-gap-closure/deferred-items.md`
  entry #1). CI (ubuntu-latest) runs WebKit cleanly.

## Source mapping

The original six-file scheme from Plan 10-06 Task 2 (`01-stammdaten-empty-cta.png`,
`02-stammdaten-filled.png`, `03-timegrid-desktop-drag.png`, `04-timegrid-mobile-375.png`,
`05-schuljahr-aktiv-badge.png`, `06-optionen-ab-banner.png`) was replaced by
the SCHOOL-XX.png naming in Plan 10.2-05 so each file maps 1:1 to a Phase-10
requirement ID (SCHOOL-01 through SCHOOL-05 + a mobile overview). The original
`.gitkeep` stub is superseded by this README.
