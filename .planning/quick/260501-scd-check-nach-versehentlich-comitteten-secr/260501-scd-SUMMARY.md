---
quick_id: 260501-scd
type: quick
scope: read-only audit
tags: [security, secret-scan, audit, vapid, keycloak, dsgvo]
key-files:
  created:
    - .planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md
  modified: []
commits:
  - 7182c13 — docs(260501-scd): scan tracked HEAD files, draft FINDINGS.md skeleton
  - 1d2b492 — docs(260501-scd): finalise FINDINGS.md with full git history scan
metrics:
  date_completed: 2026-05-01
  files_scanned: 1840
  commits_scanned: 793
  branches_scanned: 9
---

# Quick 260501-scd: Secret Scan & Audit — Summary

**One-liner:** Scanned 1840 tracked files + 793 commits across 9 branches for committed secrets; one HIGH rotation item found (VAPID dev keypair in CI workflow + plan doc), zero history-only leaks, no `.env` ever accidentally committed.

## Bottom-Line Decision

**Rotate VAPID keypair** (`9zvN…rGHE` private + `BPeB…DgSE` public) — committed as a CI fallback in `.github/workflows/playwright.yml:77-78` and re-cited in `.planning/phases/10.2-e2e-admin-console-gap-closure/10.2-05-PLAN.md:92-93`. It is a real generator-produced VAPID keypair (`web-push generate-vapid-keys --json`), not a placeholder. Severity is HIGH (not CRITICAL) because:

- It is documented as a dev/CI fallback (`secrets.VAPID_PRIVATE_KEY || '<literal>'`).
- Production deploys override via GitHub Actions repo secrets.
- BUT: the value is now publicly visible in the GitHub repo, and any developer who ever ran the dev API locally with this key would have signed real Web Push subscriptions under it.

**Operational impact of rotation:** invalidates every existing browser push subscription. Subscribers re-register silently on next visit (handled by the service-worker `pushManager.subscribe` flow). Per CLAUDE.md, this is the documented one-time cost of VAPID rotation.

## Findings Counts by Severity

| Severity | Working Tree | Git History (history-only) | Total |
|----------|-------------:|---------------------------:|------:|
| CRITICAL | 0 | 0 | 0 |
| HIGH | 1 | 0 | 1 |
| MEDIUM | 3 | 0 | 3 |
| LOW | 5 | 0 | 5 |
| INFO | 1 | 0 | 1 |
| NEEDS_HUMAN_REVIEW | 0 | 0 | 0 |

- **HIGH (1):** VAPID dev keypair private half — needs rotation.
- **MEDIUM (3):** Keycloak realm-export dev fixture passwords (5 user creds in one file = one finding); two source-code sites with `'dev-secret'` fallback for `SOLVER_SHARED_SECRET`.
- **LOW (5):** documented `schoolflow_dev` / `keycloak_dev` Docker dev defaults across compose files + Prisma config + tests.
- **INFO (1):** VAPID public key (PUBLIC by design — sent to every browser subscribing to push notifications).

**History-only findings:** zero. Every secret-shaped value in old commits is also still in HEAD (so already counted) or is a zero-entropy test stub (`'Stub' x3` literal). No secret was ever added-then-removed; rotating the HEAD copies of the VAPID keypair removes the only real exposure.

## What Was NOT Found

- No live vendor tokens (Stripe sk/pk/whsec, AWS AKIA, Google AIza, GitHub ghp/gho/ghs/ghu, Slack xox).
- No PEM private key blocks (`-----BEGIN … PRIVATE KEY-----`).
- No JWTs (`eyJ…` 3-segment).
- No DB URLs with non-placeholder passwords.
- **No `.env` file (non-example) was EVER committed in 793 commits** — `.gitignore:9` has held since the very first commit (`305cddf`, 2026-03-29).

## Recommendations (in priority order)

1. **HIGH — Rotate VAPID keypair.** Generate new pair with `pnpm --filter @schoolflow/api exec web-push generate-vapid-keys --json`. Set both `secrets.VAPID_PUBLIC_KEY` and `secrets.VAPID_PRIVATE_KEY` in GitHub repo settings. Distribute new pair to all developers' local `.env`. Then **remove the `||` fallback literals** in `.github/workflows/playwright.yml:77-78` and **scrub the same literals** from `.planning/phases/10.2-e2e-admin-console-gap-closure/10.2-05-PLAN.md:92-93` (the plan doc is intended for human reading — replace the inline command with `<redacted>`).

2. **MEDIUM — Tighten `SOLVER_SHARED_SECRET` fallback.** In `apps/api/src/modules/timetable/solver-client.service.ts:17` and `timetable.controller.ts:273`, change `configService.get('SOLVER_SHARED_SECRET', '<dev-default>')` to `configService.getOrThrow('SOLVER_SHARED_SECRET')`. Production deploys then fail-fast if the env is unset; currently they would silently auth NestJS↔Java solver with the publicly-known fallback. Also add `SOLVER_SHARED_SECRET=` to `docker/.env.example` (currently undocumented).

3. **LOW — `DEV ONLY` header on `docker/docker-compose.yml`.** The dev compose file uses literal `scho…_dev` / `keyc…_dev` passwords; add a top-of-file comment and consider a `profiles: [dev]` gate so the file is a no-op without `--profile dev`.

4. **Preventive — gitleaks in CI.** A weekly `gitleaks detect --no-git -v` over the working tree (and `--log-opts="--all"` once per release) would catch any future regression. Out of scope for this audit.

5. **Preventive — `SECURITY.md`** documenting (a) which dev creds are intentionally committed, (b) the "no real secret in git" policy, (c) report-vulnerability contact.

## Tooling Note

Ripgrep 14.1.1 was reported by `rg --version` but turned out to be a Claude Code shell-function wrapper — `xargs rg` and `command rg` both fail because there is no real `rg` binary on PATH (`brew list ripgrep` → "Not installed"). Per the constraint "do NOT install new tools", the audit fell back to **`git grep`** (HEAD scan) and **`git log -S/-G`** (history scan) — both stricter than ripgrep's tree walk because they only consider git-tracked content (exactly the audit's scope). The full pattern set (A–G + supplementary) is documented in the FINDINGS.md Methodology section so a future re-run is byte-for-byte reproducible. Recommend installing `gitleaks` for ongoing automation (Recommendation 4 above).

## Deviations from Plan

**None — plan executed exactly as written, with one tooling fallback documented in Methodology.**

The plan anticipated potential `xargs` ARG_MAX issues with ripgrep over 1840 files and provided fallback paths. The actual issue was different (no `rg` binary at all), but the plan's "fall back to whichever works first try; document the choice in FINDINGS.md" guidance covered it cleanly. `git grep` + `git log -S/-G` are arguably stricter than ripgrep over `git ls-files` because they cannot accidentally pick up untracked-but-not-gitignored files.

No source code modified, no git history rewritten, no working-tree changes outside FINDINGS.md (per constraint).

## Authentication Gates

None — read-only audit, no auth required.

## Link

- **Full report:** `.planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md`
- **Commits:** `7182c13` (Task 1 — Working Tree skeleton), `1d2b492` (Task 2 — history scan + finalisation)

## Self-Check: PASSED

- SUMMARY.md exists at the spec'd path: confirmed.
- Bottom-line rotation decision is unambiguous.
- Findings counts match FINDINGS.md Summary table.
- Both task commits exist and are reachable from current HEAD: confirmed below.
- Link to FINDINGS.md is valid (relative path resolves within `.planning/quick/260501-scd-…/`).
- No raw secret values in this SUMMARY (only redacted `9zvN…rGHE` / `BPeB…DgSE` / `scho…_dev` / `keyc…_dev`).
