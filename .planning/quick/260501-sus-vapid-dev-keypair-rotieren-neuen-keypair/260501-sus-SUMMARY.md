---
quick_id: 260501-sus
date: 2026-05-01
follows: 260501-scd
closes_finding: HIGH-VAPID-DEV-KEYPAIR
status: scrub-shipped — awaits user secret-set
---

# VAPID Dev Keypair Rotation — Runbook

## What happened

The VAPID dev keypair (private `9zvN…rGHE` / public `BPeB…DgSE`) — first committed in commit `5ccb516` on 2026-04-21 as a CI fallback — was flagged HIGH in `260501-scd-FINDINGS.md`. The fallback literals are now scrubbed from the two operational tracked files; CI is hardened to fail-fast when the secrets are missing. **The user must complete the rotation by minting a new keypair locally and pushing it to GitHub repo secrets** (Task 3 below) — Claude intentionally never held the new private key, per the security constraint at the top of this quick task.

## What this plan changed (in the working tree)

1. **Scrubbed `.github/workflows/playwright.yml`** (commit `fb5cf11`):
   - Removed both `||` fallback literals; CI now uses bare `${{ secrets.VAPID_PUBLIC_KEY }}` / `${{ secrets.VAPID_PRIVATE_KEY }}` only.
   - Added a `Preflight — VAPID secrets present` step right after `Install dependencies`. It fails the job loud with `::error::` annotations when either secret is empty, instructing the operator how to mint and push them. The step echoes only lengths, never the values.
2. **Scrubbed `.planning/phases/10.2-e2e-admin-console-gap-closure/10.2-05-PLAN.md`** (same commit `fb5cf11`):
   - Replaced the same two literals with bare-secret form plus a one-line rotation-traceability comment pointing here. Plan narrative untouched.
3. **NOT changed**: `.env.example` (root + `docker/`) — both VAPID slots are already empty there, no leak to scrub.

`git grep` for both leaked literals returns zero matches in the working tree outside `.planning/quick/260501-sus-vapid-dev-keypair-rotieren-neuen-keypair/260501-sus-PLAN.md` (where they appear as part of the plan's own scrub-verification commands and rotation-event documentation). See "Deviations from plan" below for why this is structurally necessary and how it'll be cleaned up downstream.

## New public key

**Intentionally absent from this file.** See the "Deviations from plan" section below — the plan asked Claude to mint the new keypair and embed the public key here, but the project-level security constraint forbids the new private key from ever appearing in any agent transcript or shell-output stream, and the agent's `Bash` tool output IS the transcript. The two sub-options ((a) display once via terminal, (b) write public to `/tmp`) both leak the paired private key to the transcript at generation time, which means the corresponding public key would identify a compromised pair. Claude therefore did not embed a Claude-generated public key here; the user mints the keypair locally in Task 3 and is the sole holder of both halves until they push them to GitHub.

When the user has minted the new pair locally and pushed both secrets to GitHub, they should append the new public key here in a follow-up commit (it is safe to commit — broadcast to every browser by design):

```
<paste new public key after running: pnpm --filter @schoolflow/api exec web-push generate-vapid-keys --json>
```

## What the USER must do next (Task 3 — manual checkpoint)

Run from a local checkout (not from this Claude session — Claude must NEVER receive the private key):

```bash
# 1. Mint a fresh VAPID keypair (P-256, base64url; web-push 3.6.7 from apps/api/package.json):
pnpm --filter @schoolflow/api exec web-push generate-vapid-keys --json
# Example output:
#   {"publicKey":"BL4l…ru8","privateKey":"Lhg7…dULg"}
# Copy both halves into your clipboard / a password manager NOW.
# Do NOT paste the private half into chat with Claude or any other LLM.

# 2. Push both halves to GitHub repo secrets so CI picks them up:
echo "<paste new public  key here>" | gh secret set VAPID_PUBLIC_KEY  --repo <owner>/openaustria-school-flow
echo "<paste new PRIVATE key here>" | gh secret set VAPID_PRIVATE_KEY --repo <owner>/openaustria-school-flow

# 3. Verify both secrets are now set:
gh secret list --repo <owner>/openaustria-school-flow | grep VAPID
# Expected: both VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY listed with a recent `Updated` timestamp.

# 4. Update your local apps/api/.env (gitignored) with the new pair:
#    VAPID_PUBLIC_KEY=<new public>
#    VAPID_PRIVATE_KEY=<new private>
#    VAPID_SUBJECT=mailto:admin@schoolflow.example
# (.env.example slots are intentionally empty — those don't change.)

# 5. Open a PR with this scrub commit (fb5cf11). The new `Preflight — VAPID
#    secrets present` step in playwright.yml will run early in the job; if
#    the secrets are correctly set, it prints
#    "VAPID secrets present (public key length=87, private length=43)."
#    and the workflow proceeds. If either secret is missing, it fail-fasts
#    with a clear ::error:: message — that's the guard working as designed.

# 6. (Recommended) After the rotation is live in CI, append the new public
#    key into the "New public key" placeholder block in this SUMMARY.md so
#    future audits can verify which pair this rotation event minted.
```

## Operational impact

- **Every existing browser push subscription becomes invalid** as soon as the new key is in production. Subscribers re-register silently on their next visit (handled by the service-worker subscribe flow). This is the documented one-time cost of VAPID rotation per the original Phase 9 plan.
- **Any developer running the local API** must update `apps/api/.env` with the new pair before they can sign push notifications. The old pair is now operationally inert (no developer should still hold the old private key in their `.env` after this rotation).
- **CI on forks without `secrets.VAPID_*`** will now fail the new preflight step. This is the desired failure mode per user request ("CI ohne `secrets.VAPID_PRIVATE_KEY` hart failt"). Forks that need the workflow must mint their own dev keypair via `web-push generate-vapid-keys` and add it as repo secrets in their fork.

## Out of scope (intentionally)

- **Git history rewrite.** The old leaked keypair is still in `git log -p 5ccb516`. Rewriting history on a public repo is disruptive and the leaked pair is now signing-power-less, so the cost-benefit doesn't justify it. Per CLAUDE.md / FINDINGS.md: rotation makes future signing useless; history rewrite is documented as not required.
- **Other findings from `260501-scd-FINDINGS.md`.** This plan closes only the HIGH (VAPID). The MEDIUM (`SOLVER_SHARED_SECRET` fallback) and LOW (Postgres/Keycloak dev defaults) items are tracked separately.
- **Scrubbing the literals from `260501-sus-PLAN.md` itself.** The active rotation plan documents the literals as part of its own scrub-verification commands. After this rotation completes, a follow-up housekeeping pass should redact them in the historical PLAN.md (replace with `9zvN…rGHE` / `BPeB…DgSE` 4+4 form). Tracked in "Deviations from plan" below.

## Deviations from plan

### Auto-applied

**1. [Rule 1 — Security] New keypair was NOT minted by Claude; user mints it locally**

- **Found during:** Task 1, Step 1 (generation step).
- **Issue:** The plan's Step 5 instructed the executor to display the new private key once via terminal output. In this Claude Code agent context, every `Bash` tool call's stdout/stderr lands in the agent transcript (logged), which directly violates the project-level security constraint at the top of this quick task: *"The new VAPID PRIVATE key MUST NEVER be ... Echoed in any logged shell command output that ends up in the agent transcript."* The constraint also explicitly recommends the safer pattern: *"have the user run `npx web-push generate-vapid-keys` themselves AFTER the scrub is committed."* The plan's note "READ THE PLAN CAREFULLY: it specifies a generation method that respects this constraint" indicates the planner expected the plan to satisfy the constraint, but the in-process realization (terminal display) does not. The constraint takes precedence.
- **Fix:** Claude (a) shipped the file scrub as Task 1 (no key needed), (b) did NOT save any minted keypair as the canonical post-rotation pair, and (c) instructs the user in Task 3 to mint locally and hold both halves until they push to `gh secret set`. The "New public key" section is a placeholder the user can fill in post-rotation.
- **Files affected:** Only this SUMMARY.md (placeholder instead of an embedded public key).
- **Failed automated check:** The plan's verify step `grep -E "^B[A-Za-z0-9_-]{86}$" SUMMARY.md` will return no match — that is the expected outcome of this deviation.
- **One-time exposure note:** Earlier in this session a generation step was attempted that did echo a private key into the transcript (~13:18 UTC, the `BIWYO59x…` / `6QNziy…` pair). That pair MUST NOT be used as the canonical rotation pair. The user should generate a *fresh* pair locally per Task 3 instructions.

**2. [Rule 1 — Scope] Leaked literals remain in `260501-sus-PLAN.md` (this plan's own source)**

- **Found during:** Task 1, Step 4 (verification grep).
- **Issue:** The plan documents the leaked literals in 8 lines of its own PLAN.md (must_haves verification claims, sanity-check commands, before/after Edit examples, verify-step grep commands, end-to-end check commands). After Task 1's Edits to the workflow + 10.2-05-PLAN, all OTHER tracked-file occurrences are gone, but the PLAN.md itself still holds them.
- **Why not auto-fix:** The orchestrator constraint forbids this executor from committing PLAN.md (handled in orchestrator Step 8). Modifying PLAN.md mid-execution would also break its self-documentation.
- **Recommended follow-up:** A small housekeeping commit (separate quick task or post-rotation cleanup) should redact the literals in PLAN.md to the 4+4 form (`9zvN…rGHE` / `BPeB…DgSE`) per FINDINGS.md convention. Until then, `git grep` on the full literal will return 8 hits all confined to the rotation plan itself.

## Verification

After Task 3 (user pushes secrets) and a CI run, this rotation is fully complete when:

- `git grep <leaked-private-literal> -- ':!*260501-sus-PLAN.md'` returns 0 hits (verified by Task 1 — see commit `fb5cf11`). The leaked private literal is the `9zvN…rGHE` value documented in `260501-scd-FINDINGS.md`; redacted to 4+4 form here to avoid re-leaking it via this runbook.
- `git grep <leaked-public-literal> -- ':!*260501-sus-PLAN.md'` returns 0 hits (verified by Task 1 — see commit `fb5cf11`). The leaked public literal is the `BPeB…DgSE` value documented in `260501-scd-FINDINGS.md` — public-by-design, but redacted here for symmetry with the private literal.
- A Playwright PR run on the new branch passes the `Preflight — VAPID secrets present` step (awaits user secret-set + PR open).
- The first push notification sent under the new key is received successfully by a browser that re-registered post-rotation (operational verification).

## Self-Check: PASSED

- `.planning/quick/260501-sus-…/260501-sus-SUMMARY.md` — FOUND
- Commit `fb5cf11` (Task 1 scrub) — FOUND in git log
- `.github/workflows/playwright.yml` — FOUND
- `.planning/phases/10.2-e2e-admin-console-gap-closure/10.2-05-PLAN.md` — FOUND
- Both leaked literals scrubbed from working tree outside this rotation plan — VERIFIED (`git grep` returns 0 hits when `':!*260501-sus-PLAN.md'` is excluded)
- New CI preflight step `Preflight — VAPID secrets present` — present in playwright.yml
- No full leaked literals in this SUMMARY (only 4+4 redacted forms `9zvN…rGHE` / `BPeB…DgSE`) — VERIFIED
- No `BIWYO59x…` / `6QNziy…` (one-time transcript-exposed compromised pair) anywhere in this SUMMARY — VERIFIED
- `/tmp/260501-sus-new-public-key.txt` — does not exist (never persisted)
