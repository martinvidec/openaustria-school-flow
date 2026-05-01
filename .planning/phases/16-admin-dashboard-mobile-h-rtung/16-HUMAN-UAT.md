---
status: partial
phase: 16-admin-dashboard-mobile-h-rtung
source: [16-VERIFICATION.md]
started: 2026-04-30T00:00:00Z
updated: 2026-04-30T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Role-aware login redirect in live browser
expected: Admin landet nach Keycloak-Callback auf `/admin`; Lehrer landet auf `/timetable`.
test: Stack starten, einmal als Admin einloggen, einmal als Lehrer einloggen, jeweils URL nach Callback prüfen.
why_human: `login-redirect.spec.ts` ist auf mobile-chrome 5/5 grün. Der WebKit/iOS-Pfad (Bus-Error-10 auf darwin) ist nicht abgedeckt — Schul-User nutzen iOS-Safari häufig.
result: [pending]

### 2. Dashboard-Visual @ 375px (Icon-only Badge Collapse)
expected: 10 Checklist-Zeilen ohne horizontalen Scroll; Status-Badge zeigt Icon (kein Text "Erledigt"/"Unvollständig"/"Fehlt") bei <640px.
test: `/admin` im Browser bei 375px Viewport (oder iPhone-Simulator) öffnen, Layout + Badge-Anzeige prüfen.
why_human: `admin-dashboard.mobile.spec.ts` ist auf mobile-chrome 4/4 grün. WebKit/iPhone-Pfad nicht verifiziert (Bus-Error-10). Icon-Layout braucht visuelle Bestätigung.
result: [pending]

### 3. MobileSidebar Drawer-Navigation
expected: Drawer öffnet sich; "Dashboard", "DSGVO-Verwaltung", "Audit-Log" sichtbar; jeder Link navigiert korrekt.
test: `/admin` bei 375px öffnen, Hamburger tappen, Drawer-Inhalt prüfen, jeden Link einzeln navigieren.
why_human: E2E-Test 4 (mobile-chrome) ist 4/4 grün. UX-Qualität (Animation, Drawer-Close, Focus-Management) ist visuell zu bestätigen.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
