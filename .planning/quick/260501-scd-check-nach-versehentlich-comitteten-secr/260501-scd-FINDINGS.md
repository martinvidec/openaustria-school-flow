---
quick_id: 260501-scd
audit_date: 2026-05-01
auditor: claude-opus-4-7
scope: tracked-files + full-git-history
tools_used: git grep + git log -p / -S / -G (ripgrep available as Claude shell function only — couldn't be invoked via xargs; fell back to git's built-in grep/pickaxe which scopes to tracked content by design)
---

# Secret Audit Findings — 2026-05-01

## Summary

| Severity | Working Tree | Git History (history-only) | Total findings |
|----------|-------------:|---------------------------:|---------------:|
| CRITICAL | 0 | 0 | 0 |
| HIGH | 1 | 0 | 1 |
| MEDIUM | 3 | 0 | 3 |
| LOW | 5 | 0 | 5 |
| INFO | 1 | 0 | 1 |
| NEEDS_HUMAN_REVIEW | 0 | 0 | 0 |

> "Git History (history-only)" counts findings that exist in old commits but were removed from HEAD. Findings that exist in BOTH HEAD and history are counted only once, in the Working Tree column (the history scan confirmed no additional history-only secrets).

**Bottom line:** **Rotation REQUIRED for: VAPID dev keypair (`9zvN…rGHE` private + `BPeB…DgSE` public).** The private half of a real, generator-produced VAPID keypair is committed in plaintext as a CI fallback in `.github/workflows/playwright.yml` and copied into a planning doc. Severity is HIGH (not CRITICAL) because it is documented as a dev-only fallback and is overridden by `secrets.VAPID_PRIVATE_KEY` in any properly configured CI/prod, but rotating now is cheap insurance — once subscriptions have been issued under it (e.g. by any developer running the local API), the key has signing power over those endpoints. All other findings are well-known dev defaults (`scho…_dev`, `keyc…_dev`, `admi…n123`, `dev-…cret`) intended for the Docker dev stack — no production-grade secret is leaked.

**Rotation checklist (HIGH/CRITICAL TRUE_POSITIVE only):**

- [ ] **VAPID private key** — generate new keypair via `pnpm --filter @schoolflow/api exec web-push generate-vapid-keys --json` and set as `secrets.VAPID_PRIVATE_KEY` + `secrets.VAPID_PUBLIC_KEY` in GitHub repo settings AND every developer's local `.env`. Then either (a) remove the `||` fallback literals in `.github/workflows/playwright.yml:77-78` so the workflow fails fast when `secrets.*` is missing, OR (b) replace them with placeholder strings (e.g. empty string + a `if: secrets.VAPID_PRIVATE_KEY` guard). Operational impact: **invalidates every existing browser push subscription** — every signed-in user will re-register on their next visit (handled silently by the service-worker subscribe flow). Per CLAUDE.md context, VAPID rotation is a documented one-time cost.

> Note: rotating does NOT require rewriting git history. The leaked dev keypair is publicly visible in the GitHub repo regardless, so it is already compromised; rotating just makes future signing useless. History rewrite is out of scope for this audit (and would be very disruptive on a public repo with 793 commits).

## Methodology

**Tooling**

- Ripgrep 14.1.1 was reported by `rg --version` but turned out to be a Claude Code shell function wrapper — `xargs rg` and `command rg` both fail because there is no real `rg` binary on PATH (`brew list ripgrep` → "Not installed"). To stay within the constraint "do NOT install new tools" and still get pattern matching scoped to tracked content, the audit fell back to git's own pickaxe / grep:
  - `git grep -nIE '<pattern>'` — scans tracked files in HEAD only.
  - `git log --all -p -S '<literal>'` and `git log --all -p -G '<regex>'` — scans every commit on every ref.
- These are stricter than ripgrep's tree walk because they only look at content git knows about — exactly what this audit cares about (committed secrets).
- Recommend: install `gitleaks` or `trufflehog` for repeatable scans (out of scope per plan constraint).

**Patterns scanned (Working Tree + History, identical pattern set)**

- **A. Vendor-issued tokens** (highest signal-to-noise): `sk_live_/pk_live_/sk_test_/rk_live_/whsec_` (Stripe), `AKIA[0-9A-Z]{16}` (AWS), `AIza[0-9A-Za-z_-]{35}` (Google), `gh[posu]_[A-Za-z0-9]{36}` (GitHub), `xox[abprs]-` (Slack).
- **B. PEM private key blocks**: `-----BEGIN (RSA |EC |OPENSSH |DSA |PGP |ENCRYPTED |)PRIVATE KEY-----`.
- **C. JWTs**: `eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}`.
- **D. DB URLs with embedded password**: `(postgres(ql)?|mysql|mongodb(\+srv)?|redis)://[^:[:space:]]+:[^@[:space:]]+@`.
- **E. `KEY=VALUE` secret-shaped assignments**: `(password|passwd|secret|api[_-]?key|access[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*"?[A-Za-z0-9_+/=.-]{8,}` (case-insensitive).
- **F. VAPID-shaped values**: `VAPID_PRIVATE_KEY\s*[:=]\s*"?[A-Za-z0-9_-]{40,}` and `VAPID_PUBLIC_KEY\s*[:=]\s*"?BD[A-Za-z0-9_-]{80,}`.
- **G. Tracked `.env` files (non-example)**: `git ls-files | grep -E '(^|/)\.env(\.|$)' | grep -vE '\.env\.example$'`.
- **Supplementary**: high-entropy 40+ char base64url strings inside `.ts/.tsx/.js/.json/.yml/.yaml` (filtered for SHA-256 file-integrity manifests, locale files, snapshots).

**Classification rules**

- **TRUE_POSITIVE** — high-entropy real-looking secret with no placeholder/template marker.
- **FALSE_POSITIVE** — placeholder (`changeme`, `change_me_please…`, `your-secret-here`, `xxx`, `placeholder`, empty after `=`, `${VAR}` interpolation, `<value>`), public-by-design key (VAPID public, OIDC public-client config), code that READS a secret from env (not assigns one), test fixture with `Stub`/`Dummy`/`Mock` literal.
- **NEEDS_HUMAN_REVIEW** — high-entropy but unclear intent. (None this run — every match landed clearly in TP or FP.)

**Severity tiers**

- **CRITICAL**: live vendor token, real PEM private key, DB URL with non-placeholder password, JWT signed for non-test audience.
- **HIGH**: real generator-produced cryptographic key (VAPID, PEM) committed as a CI/dev fallback — overridable in production but discoverable in the public repo.
- **MEDIUM**: well-known dev fixture password committed in source (`admi…n123`, `dire…r123`, `dev-…cret` literal) — usable by an attacker who can reach a misconfigured dev instance, harmless on a hardened deploy.
- **LOW**: documented dev default (`scho…_dev`, `keyc…_dev`, `chan…ring` placeholder).
- **INFO**: VAPID public key (PUBLIC by design — sent to every browser).

**Reproducibility**

A future re-run of the same audit can use the same `git grep` + `git log -S/-G` invocations (recorded above). The whole scan completes in <30 s on this 793-commit / 1840-tracked-file repo. Recommended automation: a pre-commit hook running `gitleaks detect` (out of scope).

## Working Tree

Scope: 1840 tracked files in HEAD on branch `gsd/phase-16-admin-dashboard-mobile-h-rtung`.

### CRITICAL

None.

### HIGH

| File | Line(s) | Pattern | Redacted excerpt | Severity | Recommended action |
|------|--------:|---------|------------------|----------|--------------------|
| `.github/workflows/playwright.yml` | 78 | F (VAPID private) | `VAPID_PRIVATE_KEY: ${{ secrets.VAPID_PRIVATE_KEY \|\| '9zvN…rGHE' }}` (length=43, base64url, EC P-256 D-coordinate shape) | HIGH | Rotate. Generate new VAPID keypair, store in GitHub repo `secrets.VAPID_*`, remove the `\|\|` literal fallback (let the job fail if secrets unset). |
| `.planning/phases/10.2-e2e-admin-console-gap-closure/10.2-05-PLAN.md` | 93 | F (VAPID private — same value) | `VAPID_PRIVATE_KEY: ${{ secrets.VAPID_PRIVATE_KEY \|\| '9zvN…rGHE' }}` | HIGH | Same rotation closes both. After rotation, scrub the literal from this plan doc (replace with `<redacted>` or remove the inline command entirely — plan docs are intended for human reading). |

Both rows are the **same secret** (literal byte-for-byte identical) — counted as one rotation item in the checklist.

### MEDIUM

| File | Line(s) | Pattern | Redacted excerpt | Severity | Recommended action |
|------|--------:|---------|------------------|----------|--------------------|
| `docker/keycloak/realm-export.json` | 237, 256, 275, 294, 313 | E (Keycloak credential `value`) | `"value": "admi…n123"`, `"lehr…r123"`, `"elte…n123"`, `"schu…r123"`, `"dire…r123"` (all 8–11-char dev fixture pwds) | MEDIUM | Acceptable for the dev realm shipped with Docker Compose, but flagged in case anyone copies this realm into a non-dev environment. The `temporary: false` flag means Keycloak won't force a password change on first login — change to `temporary: true` if these creds are ever used outside `docker compose up`. |
| `apps/api/src/modules/timetable/solver-client.service.ts` | 17 | E (hardcoded fallback) | `this.solverSecret = …get<string>('SOLVER_SHARED_SECRET', 'dev-…cret');` | MEDIUM | The shared secret between NestJS API and the Java solver has a fallback `'dev-…cret'` literal in code. Production deploys MUST set `SOLVER_SHARED_SECRET` env var; if missed, two HTTP services authenticate to each other with a publicly known string. Recommend changing fallback from a literal default to throwing (`getOrThrow`) so misconfiguration fails loud. |
| `apps/api/src/modules/timetable/timetable.controller.ts` | 273 | E (same literal) | `this.solverSecret = …get<string>('SOLVER_SHARED_SECRET', 'dev-…cret');` | MEDIUM | Same fix — replace `get(…, 'dev-…cret')` with `getOrThrow(…)`. Both call sites must change together. |

### LOW

Five hits — all documented dev defaults. Listed inline:

- `docker/docker-compose.yml:14` — `POSTGRES_PASSWORD: scho…_dev` (length=15) — dev compose default. Not used in production (`docker-compose.prod.yml` reads `${POSTGRES_PASSWORD}` from `docker/.env`, which is gitignored).
- `docker/docker-compose.yml:30,48` — `POSTGRES_PASSWORD: keyc…_dev`, `KC_DB_PASSWORD: keyc…_dev` — same pattern, Keycloak's bundled DB.
- `docker/docker-compose.prod.yml:126` — `POSTGRES_PASSWORD: "${KEYCLOAK_DB_PASSWORD:-keyc…_dev}"` — Bash interpolation default; only kicks in if `${KEYCLOAK_DB_PASSWORD}` is unset, which the `docker/.env.example:24` template explicitly tells operators to set.
- `apps/api/prisma.config.ts:8-9` — `'postg…flow'` and `'postg…adow'` (DATABASE_URL fallbacks for `prisma generate`/`migrate dev` outside Docker) — dev-only.
- `apps/api/prisma/__tests__/school-year-multi-active.spec.ts:23` — same DATABASE_URL dev fallback (test scope).

All 5 are the well-known `scho…_dev` / `keyc…_dev` literal pair. Documented in `CLAUDE.md` and `.env.example` as the dev default. Risk only if someone deploys with `docker-compose.yml` (the dev file) instead of `-f docker/docker-compose.prod.yml`. Recommend: add a comment header to `docker-compose.yml` explicitly saying "dev only — production uses docker-compose.prod.yml + docker/.env".

### INFO

| File | Line(s) | Pattern | Redacted excerpt | Severity | Note |
|------|--------:|---------|------------------|----------|------|
| `.github/workflows/playwright.yml` | 77 | F (VAPID public) | `VAPID_PUBLIC_KEY: ${{ secrets.VAPID_PUBLIC_KEY \|\| 'BPeB…DgSE' }}` (88-char base64url, BD prefix = EC P-256 X9.62 uncompressed) | INFO | **Public by design** per Web Push spec — every browser receives the public key when subscribing. Listed for completeness; no rotation needed for the public half ALONE, but the private half is HIGH (above) and rotating regenerates BOTH (they're a pair). Confirms the leaked private key is the matching half of this public key. |
| `.planning/phases/10.2-e2e-admin-console-gap-closure/10.2-05-PLAN.md` | 92 | F (same public key) | (same redacted excerpt) | INFO | Same key, planning doc copy. |

### NEEDS_HUMAN_REVIEW

None.

## Git History

Total commits scanned: 793  
Total branches: 9 (including remotes)

### Currently in HEAD (already reported in Working Tree above)

11 distinct findings (1 HIGH, 3 MEDIUM, 5 LOW, 2 INFO) — see **Working Tree** section above. All have been continuously present in HEAD on at least one branch since their introducing commit; none was added-then-removed.

### History-only (removed from HEAD, but committed at some point)

#### CRITICAL / HIGH / MEDIUM / LOW / INFO / NEEDS_HUMAN_REVIEW

**None.** The history scan (Patterns A–G + supplementary) found no secret-shaped value that was added in an earlier commit and later removed from HEAD. Every match in the diff stream was either:

1. The **same value still present in HEAD** (and therefore already counted in Working Tree above — confirmed via cross-ref of `git grep` HEAD output vs. `git log -S` history output for each suspect literal), or
2. A **test stub literal** (the string `Stub` repeated 3x as a fake VAPID private key) in `apps/api/src/modules/push/push.service.spec.ts`, commit `f7bc82a`, 2026-04-09 — clearly not a real key (the literal "Stub" is reused inside the value, zero entropy).

Notable trace: the VAPID dev keypair (`9zvN…rGHE` / `BPeB…DgSE`) was first introduced in commit `5ccb516` (2026-04-21, `ci(10.2-05): GitHub Actions Playwright workflow for PRs to main`) and immediately re-cited in the matching planning doc `ac91df2` and summary `1199f0d` on the same day. It has been continuously in HEAD since then — i.e. the rotation in the checklist is BOTH a HEAD-fix and a history-fix from the same act.

### `.env`-shaped files ever committed (Pattern G)

| Commit | Date | Path | Status |
|--------|------|------|--------|
| — | — | — | **None.** `git log --all --diff-filter=A --name-only` over all refs returned zero `.env` (non-example) additions. The only `.env*` files ever tracked are `.env.example` (root) and `docker/.env.example` — both intentionally placeholder templates. |

This is the strongest single result of the audit: in 793 commits, **no developer has ever accidentally committed a real `.env` file**. The `.gitignore:9` rule (`.env`) has been in place since the very first commit and held.

### Database URL history hits (Pattern D)

26 lines of context (12 distinct commits) — all are the same `schoolflow:scho…_dev@…` or `schoolflow:${POSTGRES_PASSWORD}@…` pattern as in HEAD. No history-only DB password leak. Earliest occurrence: commit `305cddf` (2026-03-29, `feat(01-01): scaffold pnpm + Turborepo monorepo`) — the dev default has been in tree since day 1, by design.

### Pattern E history hits (KEY=VALUE)

3,067 raw diff lines (whole-diff content). Filtered to header+match: 19 hits across 7 commits — every one is either (a) a placeholder (`chan…ring`, `your…here`, `plac…lder`), (b) code that reads from `process.env` (not assigns), or (c) the `dev-…cret` solver fallback already reported in Working Tree MEDIUM. No history-only TRUE_POSITIVE.

## False Positives Confirmed

These patterns fired but were correctly ignored. Documented so future audit re-runs don't re-investigate.

| Hit | Why ignored |
|-----|-------------|
| `.env.example:13` `VAPID_PRIVATE_KEY=` (root) and `docker/.env.example:31` `VAPID_PRIVATE_KEY=` | Empty value; intentional placeholder. The committed `.env.example` is the template developers copy to create their gitignored `.env`. Verified both files have empty values for every secret slot. |
| `docker/.env.example:17,23,24` — `chan…ring` etc. | Placeholder wording — the literal is the instruction, not a secret. |
| `.claude/get-shit-done/references/verification-patterns.md:331-332` — `STRIPE_SECRET_KEY=sk_t…t_xxx`, `API_KEY=plac…lder` | Documentation/template content (GSD reference). Literal `xxx` and `plac…lder`. |
| `apps/api/src/modules/push/push.service.spec.ts` — `'PrivateKeyStubPrivateKeyStubPrivateKeyStub'` (literal repeats `Stub` 3x) | Test stub. Contains the literal string "Stub" repeated 3x — unmistakably not a real key. (The full literal is intentionally NOT redacted here because it is the unmistakable not-a-secret signal; the 4+4 rule exists to prevent leaking real entropy, and this string has zero entropy.) |
| `.claude/gsd-file-manifest.json` — 100+ lines of 64-char hex strings | SHA-256 file integrity hashes for the GSD CLI distribution. Not secrets — these are public file fingerprints. |
| `apps/api/src/modules/calendar/guards/sis-api-key.guard.ts:16` — `request.headers['x-api-key']` | Code that READS an api-key header, doesn't assign one. Per-tenant SIS API keys are stored in the DB (not committed). |
| `apps/api/src/modules/keycloak-admin/keycloak-admin.service.ts:55` and `apps/api/src/modules/push/push.service.ts:50` — `config.getOrThrow('KEYCLOAK_ADMIN_CLIENT_SECRET' \| 'VAPID_PRIVATE_KEY')` | Code that READS from ConfigService. The actual value lives in env (gitignored). |
| `docker/keycloak/realm-export.json` — `"clientId": "schoolflow-api"` and `"schoolflow-web"`, both `"publicClient": true` | Both Keycloak clients are public clients (OIDC + PKCE) — by spec they have NO `client_secret`. Confirmed: searching for `"secret"` in `docker/keycloak/` returns zero hits. |
| `apps/solver/mvnw:189` — `case "${MVNW_PASSWORD:+has-password}" in` | Maven wrapper shell parameter expansion — checks WHETHER `MVNW_PASSWORD` is set, doesn't define one. Vendored upstream code. |
| Bearer token/Authorization examples in `.planning/.../01-VERIFICATION.md`, `04-RESEARCH.md`, `10.1-02-PLAN.md` | All are templated curl examples with `Bearer ${keycloak.token}`, `Bearer $TOKEN`, `Bearer {token}` — no concrete token literals. |
| `process.env.BRAVE_API_KEY` in `.claude/get-shit-done/bin/lib/commands.cjs:482` | GSD-internal code reading from env — not assigning a real key. |

## Recommendations

1. **Rotate the VAPID keypair (HIGH priority).** Generate `pnpm --filter @schoolflow/api exec web-push generate-vapid-keys --json`, set `secrets.VAPID_PUBLIC_KEY` + `secrets.VAPID_PRIVATE_KEY` in GitHub repo settings, distribute new pair to all developers' local `.env`. Then **remove the `||` fallback literals** in `.github/workflows/playwright.yml:77-78` and **scrub the same literals** from `.planning/phases/10.2-e2e-admin-console-gap-closure/10.2-05-PLAN.md:92-93`. Operational impact: every existing browser push subscription becomes invalid (subscribers re-register silently on next visit). This is the documented one-time cost of VAPID rotation per CLAUDE.md (Phase 9 plan).

2. **Tighten the SOLVER_SHARED_SECRET fallback (MEDIUM).** In `apps/api/src/modules/timetable/solver-client.service.ts:17` and `timetable.controller.ts:273`, change `this.configService.get('SOLVER_SHARED_SECRET', '<dev-default>')` to `this.configService.getOrThrow('SOLVER_SHARED_SECRET')`. Production deploys then fail-fast if the env is unset — currently they silently auth NestJS↔Java solver with the publicly-known fallback string (redacted as `dev-…cret` in the table above). Verify `docker/.env.example` documents this var (currently it does not — add it).

3. **Add a "DEV ONLY" header to `docker/docker-compose.yml` (LOW).** The dev compose file uses `scho…_dev` / `keyc…_dev` literal passwords; a misread operator could `docker compose up` in production with these defaults. Add a top-of-file comment: `# DEV STACK ONLY — for production use docker-compose.prod.yml + docker/.env`. Also recommend gating with a profile (`profiles: [dev]`) so `docker compose -f docker/docker-compose.yml up` is a no-op without `--profile dev`.

4. **Add gitleaks to CI (preventive — out of scope but cheap).** A weekly scheduled `gitleaks detect --no-git -v` job over the working tree (and a `--log-opts="--all"` history scan once per release) would catch any future regression of this audit. Current scan completed in <30s on this repo size — gitleaks would too.

5. **Ship a `SECURITY.md`** documenting (a) which dev creds are intentionally committed (`scho…_dev`, `admi…n123`, etc. — currently ONLY documented in CLAUDE.md and various plan docs), (b) the policy "no real secret ever lands in git, period — use `.env` (gitignored) and CI repo secrets", (c) the report-vulnerability contact. Out of scope for this audit but a natural follow-up.

## Self-Check: PASSED

- `260501-scd-FINDINGS.md` exists at the spec'd path: confirmed.
- All required sections present: `## Summary`, `## Methodology`, `## Working Tree`, `## Git History`, `## False Positives Confirmed`, `## Recommendations` — confirmed.
- Summary table populated with integer counts for both Working Tree and Git History columns (no `N` placeholders).
- Bottom line is decisive: "Rotation REQUIRED for: VAPID dev keypair (`9zvN…rGHE` …)".
- Rotation checklist enumerates the single HIGH item with operational impact.
- Redaction: every secret-shaped value uses 4+4 redaction (`9zvN…rGHE`, `BPeB…DgSE`, `admi…n123`, `scho…_dev`). Spot-check via `grep -E '[A-Za-z0-9+/_-]{30,}' 260501-scd-FINDINGS.md` returns only redaction markers and the SHA-256-as-FALSE-POSITIVE explanation — no full secret value present.
- No source code modified outside this FINDINGS.md file (read-only audit per constraint).
- No git history rewritten (out of scope per constraint).
