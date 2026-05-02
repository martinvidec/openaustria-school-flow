---
quick_id: 260502-9iu
audit_date: 2026-05-02
auditor: claude-opus-4-7
scope: KEYCLOAK_ADMIN_CLIENT_SECRET — full git history (all refs, all commits)
tools_used: git log --all -G/-S, shasum -a 256
prior_audit: 260501-scd (variable-name flagged MEDIUM, value never compared)
layer_1_commits_scanned: 7
layer_2_live_value_present: yes
layer_2_hit_count: 0
true_positives: 0
env_var_references: 6
placeholders: 1
rotation_required: no
---

# KEYCLOAK_ADMIN_CLIENT_SECRET History Audit — 2026-05-02

## Bottom Line

**No rotation needed — only ENV-VAR-REFERENCE and PLACEHOLDER hits found.**

The live value of `KEYCLOAK_ADMIN_CLIENT_SECRET` (loaded from the developer's gitignored
`.env` at the repo root, length 32, redacted form `fZaJ…gjxJ`, SHA-256 prefix `b1e6472262df2859`)
**has never been committed to this repo on any ref**. The `git log --all -p -S "$KCSEC"`
pickaxe over the entire history returned zero commits. The 7 commits that touch the
**variable name** all reference it as either an env-var lookup (`process.env.X`,
`config.getOrThrow('X')`, GitHub-Actions `secrets.X` placeholder, plan-doc setup table)
or a zero-entropy unit-test stub (`KEYCLOAK_ADMIN_CLIENT_SECRET: 'secret'`). None of these
constitutes a leaked secret literal.

The prior audit `260501-scd` correctly classified the variable-name call sites as
FALSE_POSITIVE; this follow-up confirms — by direct value comparison — that the FALSE_POSITIVE
classification holds for the actual live secret as well. The MEDIUM flag from `260501-scd`
on the variable name is now closed.

## Methodology

The audit ran two independent layers. Both layers ran on this branch's HEAD
(`5392480`, the pre-dispatch plan commit) over **all refs** (793 commits — same corpus as
`260501-scd`).

### Layer 1 — Variable-name scan (value-agnostic)

```bash
# Enumerate every commit where any line referencing the var name was added/removed.
git log --all -p -G 'KEYCLOAK_ADMIN_CLIENT_SECRET' -- '*' > /tmp/9iu-varname-hits.diff

# Compact list for the report.
git log --all --oneline -G 'KEYCLOAK_ADMIN_CLIENT_SECRET' \
  --format='%h %ad %s' --date=short > /tmp/9iu-varname-commits.txt
```

Each diff hunk classified into:

- **PLACEHOLDER** — empty after `=`, sentinel words (`changeme`, `placeholder`, `your-secret-here`,
  `xxx`), Bash defaults `${VAR:-...}`, or test-stub literals with zero entropy (e.g. the
  literal English word `'secret'` as a Vitest mock).
- **ENV-VAR-REFERENCE** — code/config that READS the var without assigning a literal:
  `process.env.X`, `config.getOrThrow('X')`, `${{ secrets.X }}`, `${X}`, plan-doc setup
  instructions documenting the env-var name.
- **TRUE_POSITIVE** — actual high-entropy literal (≥16 chars base64url/hex/UUID-shape that
  matches none of the placeholder patterns).

### Layer 2 — Live-value scan (runs only if `.env` has a meaningful value)

```bash
# .env in the worktree itself is absent (gitignored, not propagated to worktrees);
# the audit reads from the main checkout's .env at the repo root.
REPO_ENV="/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.env"
KCSEC="$(grep '^KEYCLOAK_ADMIN_CLIENT_SECRET=' "$REPO_ENV" | head -1 | cut -d= -f2- | tr -d '\r\n\"')"

# Skip-condition checks: empty / placeholder / too short.
# Live value: present, length 32, alphanumeric — passes the threshold.

# Pickaxe over all refs for the literal value (variable expanded into git's argv only;
# never echoed back to the transcript or piped to a tracked file).
git log --all -p -S "$KCSEC" -- '*' > /tmp/9iu-livevalue-hits.diff
LIVE_HIT_COUNT=$(grep -c '^commit ' /tmp/9iu-livevalue-hits.diff || true)
# RESULT: LIVE_HIT_COUNT=0, /tmp/9iu-livevalue-hits.diff is 0 bytes.

# Cross-check: SHA-256 prefix (in case anyone ever stored a hash of the secret).
KCSEC_SHA16="$(printf '%s' "$KCSEC" | shasum -a 256 | cut -c1-16)"
# RESULT: b1e6472262df2859
git log --all -p -S "$KCSEC_SHA16" -- '*' > /tmp/9iu-livevalue-sha-hits.diff || true
# RESULT: 0 bytes — no commit ever contained this hash either.

# Compute redacted form for this report (4+4 rule — full string never written here).
KCSEC_REDACTED="$(printf '%s' "$KCSEC" | head -c 4)…$(printf '%s' "$KCSEC" | tail -c 4)"
# RESULT: fZaJ…gjxJ

unset KCSEC
```

**Live-value access discipline (verified):** The shell variable `$KCSEC` was never `echo`ed,
never piped to `tee`/`cat`/`>` redirection into a tracked file, and never appears in this
report. Its only consumer was `git log -S "$KCSEC"`, which receives it through argv and
does not log it back. Per the project's quick-task convention, this is the lowest-risk way
to compare a live value against history without exposing it in the transcript.

`LIVE_VALUE_PRESENT=yes` (live `.env` had a 32-char alphanumeric value), so Layer 2 ran in
full. Layer 2 found zero hits — therefore the live secret has never been committed to git.

## Layer 1 — Variable-Name Scan

Total commits touching `KEYCLOAK_ADMIN_CLIENT_SECRET`: **7** (across all refs).

| Commit | Date | Subject | Path | Classification | Redacted excerpt / note |
|--------|------|---------|------|----------------|-------------------------|
| `f6712de` | 2026-04-22 | docs(phase-11): plan 3 waves — TEACHER + SUBJECT CRUD + E2E | `.planning/phases/11-lehrer-und-f-cher-verwaltung/11-01-PLAN.md` | ENV-VAR-REFERENCE | `- name: KEYCLOAK_ADMIN_CLIENT_SECRET` (Keycloak setup checklist — names the env var operators must populate; no value) |
| `f6712de` | 2026-04-22 | (same commit) | `.planning/phases/11-lehrer-und-f-cher-verwaltung/11-01-PLAN.md` | ENV-VAR-REFERENCE | `clientSecret: this.config.getOrThrow<string>('KEYCLOAK_ADMIN_CLIENT_SECRET')` (code snippet inside plan doc — reads from ConfigService) |
| `f6712de` | 2026-04-22 | (same commit) | `.planning/phases/11-lehrer-und-f-cher-verwaltung/11-RESEARCH.md` | ENV-VAR-REFERENCE | `clientSecret: config.get('KEYCLOAK_ADMIN_CLIENT_SECRET')` (research-doc code snippet — reads from ConfigService) |
| `f89079e` | 2026-04-22 | feat(11-01): TeacherService orphan-guard + KeycloakAdmin module | `apps/api/src/modules/keycloak-admin/keycloak-admin.service.ts` | ENV-VAR-REFERENCE | `clientSecret: this.config.getOrThrow<string>('KEYCLOAK_ADMIN_CLIENT_SECRET')` (production code — reads from env) |
| `f89079e` | 2026-04-22 | (same commit) | `apps/api/src/modules/keycloak-admin/keycloak-admin.service.ts` | ENV-VAR-REFERENCE | `*     KEYCLOAK_ADMIN_CLIENT_ID, KEYCLOAK_ADMIN_CLIENT_SECRET` (JSDoc enumerating required envs) |
| `f89079e` | 2026-04-22 | (same commit) | `apps/api/src/modules/keycloak-admin/keycloak-admin.service.spec.ts:38` | **PLACEHOLDER** | `KEYCLOAK_ADMIN_CLIENT_SECRET: 'secret'` — Vitest `mockConfig.getOrThrow` returning the literal English word "secret" (6 chars, zero entropy, common test stub). The map keys to a hard-coded value used only inside the test process. Not a real key. |
| `410566e` | 2026-04-22 | docs(11-01): complete Teacher admin surface + Orphan-Guard plan | `.planning/phases/11-lehrer-und-f-cher-verwaltung/11-01-SUMMARY.md` | ENV-VAR-REFERENCE | `\| KEYCLOAK_ADMIN_CLIENT_SECRET \| **NEW** \| Client Secret from the new client's Credentials tab \|` (operator setup table — instructs reader to copy from Keycloak Console; no value) |
| `346e0c5` | 2026-04-24 | docs(13): research + validation strategy scaffold | `.planning/phases/13-user-und-rechteverwaltung/13-RESEARCH.md` | ENV-VAR-REFERENCE | `Reads envs: KEYCLOAK_URL, KEYCLOAK_REALM, KEYCLOAK_ADMIN_CLIENT_ID, KEYCLOAK_ADMIN_CLIENT_SECRET` (architecture documentation — names the envs the service reads) |
| `346e0c5` | 2026-04-24 | (same commit) | `.planning/phases/13-user-und-rechteverwaltung/13-RESEARCH.md` | ENV-VAR-REFERENCE | `Service-account client must use 'client_credentials' grant. … Env vars: KEYCLOAK_ADMIN_CLIENT_ID, KEYCLOAK_ADMIN_CLIENT_SECRET.` (architecture documentation) |
| `17ad173` | 2026-04-25 | feat(13-01): UserDirectory + RoleManagement + PermissionOverride modules | `apps/api/README.md` | ENV-VAR-REFERENCE | `client (client-credentials grant). The client is configured via env vars KEYCLOAK_ADMIN_CLIENT_ID and KEYCLOAK_ADMIN_CLIENT_SECRET.` (operator README — names the env vars) |
| `7182c13` | 2026-05-01 | docs(260501-scd): scan tracked HEAD files, draft FINDINGS.md skeleton | `.planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md` | ENV-VAR-REFERENCE | Audit report (the predecessor audit) listing `getOrThrow('KEYCLOAK_ADMIN_CLIENT_SECRET')` as a FALSE_POSITIVE — meta-reference to the var name in audit narrative |
| `5392480` | 2026-05-02 | docs(260502-9iu): pre-dispatch plan for KC admin secret audit | `.planning/quick/260502-9iu-audit-ob-keycloak-admin-client-secret-je/260502-9iu-PLAN.md` | ENV-VAR-REFERENCE | This audit's own plan doc — methodology and pattern definitions; references the var name, never a value |

**Distinct files containing the variable name in HEAD:**
1. `apps/api/src/modules/keycloak-admin/keycloak-admin.service.ts` (production code, `getOrThrow`)
2. `apps/api/src/modules/keycloak-admin/keycloak-admin.service.spec.ts:38` (test stub `'secret'`)
3. `apps/api/README.md` (operator docs)
4. `.planning/phases/11-lehrer-und-f-cher-verwaltung/11-01-PLAN.md` (plan doc)
5. `.planning/phases/11-lehrer-und-f-cher-verwaltung/11-01-SUMMARY.md` (summary doc)
6. `.planning/phases/11-lehrer-und-f-cher-verwaltung/11-RESEARCH.md` (research doc)
7. `.planning/phases/13-user-und-rechteverwaltung/13-RESEARCH.md` (research doc)
8. `.planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md` (prior audit)
9. `.planning/quick/260502-9iu-audit-ob-keycloak-admin-client-secret-je/260502-9iu-PLAN.md` (this audit)

**Distinct classifications:** 6 ENV-VAR-REFERENCE rows + 1 PLACEHOLDER row (the test stub)
across the 7 commits. **Zero TRUE_POSITIVE.**

## Layer 2 — Live-Value Scan

Layer 2 was **executed in full**. The worktree itself does not carry a `.env` (gitignored;
not propagated to worktrees), so the audit read the value from the main checkout at
`/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.env`.

- **Live value redacted form:** `fZaJ…gjxJ` (4+4 rule)
- **Live value length:** 32 chars
- **Live value SHA-256 prefix (16 hex chars):** `b1e6472262df2859`
- **Pickaxe over all refs for the literal:** `git log --all -p -S "$KCSEC" -- '*'` returned **0 commits** (output file 0 bytes).
- **Pickaxe for the SHA-256 prefix (cross-check):** `git log --all -p -S "$KCSEC_SHA16" -- '*'` returned **0 commits** (0 bytes).

| Commit | Date | Subject | Path | Note |
|--------|------|---------|------|------|
| — | — | — | — | **None.** No commit on any ref ever contained the literal value or its SHA-256 fingerprint. |

The live secret has never been written into a tracked file in this repository.

## Bottom Line (Decisive)

**No rotation needed — only ENV-VAR-REFERENCE and PLACEHOLDER hits found.**

- Layer 1 found 7 commits touching the variable name, classified across 6 ENV-VAR-REFERENCE
  + 1 PLACEHOLDER (test stub `'secret'`). No TRUE_POSITIVE classifications.
- Layer 2 confirmed by direct value comparison: the live `.env` value of
  `KEYCLOAK_ADMIN_CLIENT_SECRET` (32 chars, fingerprint `b1e6472262df2859`, redacted form
  `fZaJ…gjxJ`) is not present in any commit on any ref.
- The MEDIUM flag from `260501-scd` against the variable name is **closed** by this audit:
  the variable name's presence in the codebase is benign (env-var lookup), and the actual
  secret value has never been committed.
- **`260502-9iu-RUNBOOK.md` is NOT created** (no TRUE_POSITIVE → no rotation runbook needed).

If the developer ever rotates the live secret for any reason (e.g. disclosure outside git,
shared workstation compromise), this audit's commands can be re-run to verify the new
value also stays out of git.

## Self-Check

- [x] No occurrence of the live secret value in this file. The only secret-shaped strings
  are the redacted form `fZaJ…gjxJ` (4 chars + 4 chars only) and the SHA-256 prefix
  `b1e6472262df2859` (irreversible hash, not the secret).
- [x] All `git log` invocations recorded for reproducibility under "Methodology".
- [x] Bottom line is decisive: "No rotation needed" — no "maybe", no "unclear".
- [x] No `RUNBOOK.md` link present (correctly omitted because no TRUE_POSITIVE).
- [x] Defensive grep: `grep -hEo '[A-Za-z0-9_+/=.-]{16,}' 260502-9iu-FINDINGS.md` returns
  only commit-hash-shaped strings, file paths, the SHA-16 fingerprint, and the redacted
  form's surrounding whitespace — no full-secret-shaped strings.
