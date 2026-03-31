---
phase: 04-timetable-viewing-editing-room-management
plan: 02
subsystem: ui
tags: [react, vite, tanstack-router, tanstack-query, zustand, shadcn-ui, tailwind-css-4, keycloak, oidc]

requires:
  - phase: 03-timetable-solver-engine
    provides: API backend foundation with NestJS modules
provides:
  - React SPA scaffold at apps/web/ with Vite 8 + React 19
  - Keycloak OIDC authentication with PKCE and silent SSO
  - TanStack Router file-based routing with type safety
  - TanStack Query client configured for server state management
  - Zustand UI state store (sidebar, view mode, week type)
  - shadcn/ui P0 components (button, card, tabs, select, dialog, badge, sonner)
  - Role-based sidebar navigation matching UI-SPEC
  - Authenticated route wrapper gating all child routes
affects: [04-05, 04-06, 04-07, 04-08, phase-05, phase-06, phase-07, phase-08, phase-09]

tech-stack:
  added: [react@19, vite@8, @tanstack/react-router, @tanstack/react-query@5, zustand@5, tailwindcss@4, shadcn/ui, keycloak-js@26, sonner, lucide-react, class-variance-authority, clsx, tailwind-merge, @dnd-kit/core, @dnd-kit/sortable, socket.io-client]
  patterns: [file-based-routing, keycloak-before-render, apiFetch-with-token-refresh, zustand-ui-store]

key-files:
  created:
    - apps/web/src/main.tsx
    - apps/web/src/lib/keycloak.ts
    - apps/web/src/lib/api.ts
    - apps/web/src/routes/__root.tsx
    - apps/web/src/routes/_authenticated.tsx
    - apps/web/src/components/layout/AppSidebar.tsx
    - apps/web/src/components/layout/AppHeader.tsx
    - apps/web/vite.config.ts
    - apps/web/components.json
  modified:
    - apps/web/package.json
    - pnpm-lock.yaml

key-decisions:
  - "Keycloak init runs before React render to ensure token is available for all API calls"
  - "TanStack Router with file-based route generation via Vite plugin"
  - "shadcn/ui initialized with default style, P0 components added upfront"
  - "API proxy via Vite dev server for /api and /socket.io paths"

patterns-established:
  - "Keycloak-before-render: initKeycloak() completes before createRoot()"
  - "apiFetch pattern: auto-refreshes token before each request"
  - "Role-based nav: sidebar items filtered by keycloak.realmAccess.roles"
  - "Zustand for UI state only, TanStack Query for server state"

requirements-completed: [VIEW-01, VIEW-02, VIEW-03]

duration: 5min
completed: 2026-03-31
---

# Plan 04-02: React SPA Scaffold Summary

**Complete React SPA with Vite 8, TanStack Router, Keycloak OIDC auth, role-based sidebar, and shadcn/ui component library**

## Performance

- **Duration:** 5 min
- **Completed:** 2026-03-31
- **Tasks:** 2
- **Files created:** 30

## Accomplishments
- Full SPA scaffold at apps/web/ with locked technology stack
- Keycloak OIDC integration with PKCE, silent SSO, and token auto-refresh
- Role-based sidebar navigation (5 items filtered by user role per UI-SPEC)
- 7 shadcn/ui P0 components installed and ready

## Task Commits

1. **Task 1: Scaffold apps/web with full stack** - `03e8de5` (feat)
2. **Task 2: Root layout with role-based sidebar** - `4293c1b` (feat)

## Files Created/Modified
- `apps/web/vite.config.ts` - Vite config with TanStack Router plugin, Tailwind CSS, API proxy
- `apps/web/src/main.tsx` - React entry with Keycloak init, QueryClientProvider, RouterProvider
- `apps/web/src/lib/keycloak.ts` - Keycloak singleton with PKCE and silent SSO
- `apps/web/src/lib/api.ts` - apiFetch with automatic token refresh
- `apps/web/src/routes/__root.tsx` - Root layout with sidebar + header
- `apps/web/src/routes/_authenticated.tsx` - Auth gate redirecting to Keycloak login
- `apps/web/src/components/layout/AppSidebar.tsx` - Role-filtered nav items
- `apps/web/src/components/layout/AppHeader.tsx` - Header with user info and logout
- `apps/web/src/stores/ui-store.ts` - Zustand store for sidebar, view mode, week type

## Decisions Made
- Keycloak initializes before React render to guarantee token availability
- Vite proxy handles /api and /socket.io for development
- shadcn/ui default style chosen with Inter font from UI-SPEC

## Deviations from Plan
None - plan executed as written.

## Issues Encountered
- Agent crashed due to API connection error after completing all file writes; commits and summary created by orchestrator.

## Next Phase Readiness
- SPA scaffold ready for all subsequent UI plans (04-05 through 04-08)
- Route placeholders in place for timetable, rooms, and admin sections

---
*Phase: 04-timetable-viewing-editing-room-management*
*Completed: 2026-03-31*
