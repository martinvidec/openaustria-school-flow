# Phase 9: Mobile, PWA & Production Readiness - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

The platform works seamlessly on mobile devices with push notifications and offline access, and the deployment is production-grade with backup/restore and zero-downtime updates. This phase delivers: responsive audit of all pages, PWA with offline timetable, Web Push notifications, backup/restore scripts, health check endpoints, production Docker setup, and zero-downtime deployment. Requirements: MOBILE-01 through MOBILE-03, DEPLOY-02, DEPLOY-03.

</domain>

<decisions>
## Implementation Decisions

### Mobile Responsiveness & PWA
- **D-01:** Tailwind breakpoints audit on existing components. Fix layout issues across all pages for sm/md/lg breakpoints. No new framework -- existing Tailwind responsive utility classes. Focus on timetable grid, classbook, messaging list-detail, import wizard.
- **D-02:** Vite PWA plugin (vite-plugin-pwa) with Workbox service worker. manifest.json with SchoolFlow branding. Install prompt support. Minimal config approach.
- **D-03:** Offline scope: today's timetable only. Cache GET /timetable response for current day via service worker. Show "Offline" banner when disconnected. Other features require network.
- **D-04:** Standard PWA install prompt. Browser-native Add to Home Screen banner. Custom "App installieren" button in settings page. iOS Safari meta tags for home screen icon.

### Push Notifications
- **D-05:** Web Push API with VAPID keys. Standard browser push via service worker. Works on Android Chrome, desktop browsers, iOS Safari 16.4+. VAPID keys generated server-side and stored in env vars.
- **D-06:** Push triggers: timetable changes, new messages, substitution offers, exam/homework assigned. Extends existing NotificationService to also trigger web push alongside Socket.IO. Same Notification entity, new delivery channel.
- **D-07:** Permission prompt on first relevant action (not on page load). "Benachrichtigungen aktivieren" button in settings. Ask when user first clicks notification bell or views settings.
- **D-08:** Backend uses web-push npm package. PushSubscription entity per user in DB. BullMQ job to batch push delivery. Failed/expired subscriptions auto-cleaned on 410 response.

### Production Readiness
- **D-09:** pg_dump backup scripts + Docker volume backup. Documented shell scripts for PostgreSQL dump, Redis snapshot, file upload directory backup. Cron-ready with timestamp naming. Restore script with integrity verification (row count comparison).
- **D-10:** Docker Compose rolling update for zero-downtime deployment. Health check endpoints on all services. `docker compose up -d --no-deps --build api` for rolling restart. No Kubernetes for v1.
- **D-11:** Dedicated /health and /ready endpoints. /health returns 200 if process alive (liveness). /ready checks DB + Redis + Keycloak connectivity (readiness). Used by Docker healthcheck directive.
- **D-12:** Multi-stage Dockerfile. Build stage compiles TypeScript, runtime stage uses node:24-alpine. Docker Compose production profile with resource limits, structured logging, restart policies. .env.example with all required environment variables documented.

### Claude's Discretion
- Exact Workbox caching strategies (StaleWhileRevalidate vs CacheFirst)
- Service worker update notification UX
- VAPID key generation and rotation strategy
- Push notification payload format and size limits
- Backup retention policy (how many backups to keep)
- Docker resource limit values (memory, CPU)
- Health check timeout and retry configuration
- Responsive breakpoint-specific layout decisions per page
- PWA manifest icon sizes and splash screens

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **NotificationService** (Phase 6) -- extensible type enum, generic Notification entity
- **BullMQ infrastructure** (Phase 2/3/8) -- job queue pattern for push delivery batching
- **Socket.IO namespaces** (Phase 3-8) -- real-time event delivery pattern
- **Tailwind CSS 4** -- utility-first responsive classes already in use
- **Docker Compose** (docker/) -- existing dev environment with PostgreSQL, Keycloak, Redis, Solver
- **HealthModule** (Phase 1) -- basic /health endpoint may already exist
- **Vite 8** build system -- PWA plugin compatible

### Established Patterns
- @nestjs/schedule for cron jobs (Phase 2 DSGVO retention)
- Environment variable configuration via @nestjs/config
- Fastify HTTP adapter
- Global APP_GUARD with @Public() opt-out

### Integration Points
- NotificationService -- add web push delivery alongside Socket.IO
- Docker Compose -- extend with production profile
- Vite config -- add PWA plugin
- Service worker -- register in main.tsx
- Settings page -- add push opt-in and PWA install buttons

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. All decisions were accepted at recommended defaults.

</specifics>

<deferred>
## Deferred Ideas

- React Native mobile app (v2)
- Full offline mode with sync queue
- Kubernetes Helm charts
- Cloud-managed backup (AWS RDS, etc.)
- Push notification preferences per category
- Background sync for offline form submissions
- CDN and asset optimization

</deferred>
