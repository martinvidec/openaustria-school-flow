---
phase: quick
plan: 260501-scd
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md
autonomous: true
requirements: [SECRET-AUDIT-01]
must_haves:
  truths:
    - "Every tracked file in HEAD has been scanned for committed secrets."
    - "Full git history (all branches, all commits) has been scanned for the same secret patterns."
    - "Findings are classified as TRUE_POSITIVE, FALSE_POSITIVE, or NEEDS_HUMAN_REVIEW with severity (CRITICAL/HIGH/MEDIUM/LOW)."
    - "Each TRUE_POSITIVE has a recommended action (rotate / verify-test-only / not-a-secret) and a redacted excerpt."
    - "User can act on the report immediately — knows what to rotate, what to ignore, what needs a deeper look."
  artifacts:
    - path: ".planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md"
      provides: "Structured secret-audit findings report"
      contains: "## Summary"
  key_links:
    - from: "git ls-files (HEAD scan)"
      to: "FINDINGS.md > Working Tree section"
      via: "ripgrep with redacted excerpts"
      pattern: "## Working Tree"
    - from: "git log --all -p (history scan)"
      to: "FINDINGS.md > Git History section"
      via: "ripgrep over full diff stream"
      pattern: "## Git History"
---

<objective>
Audit the SchoolFlow repo for accidentally committed secrets — both in tracked HEAD files and across full git history — and produce a single actionable findings report.

Purpose: Determine whether any rotation is needed (VAPID keys, Postgres/Keycloak passwords, JWT signing keys, OAuth client secrets, API tokens). Secrets removed from HEAD but still in history are equally compromised.
Output: `.planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md` with severity-classified findings + recommended actions.
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@./.gitignore
@./.env.example
@./docker/.env.example
@./.planning/STATE.md

<environment_facts>
<!-- Pre-checked by planner on 2026-05-01 to spare the executor a discovery round-trip. -->

- Tooling available: `rg` (ripgrep 14.1.1), `git`. Tooling NOT available: `gitleaks`, `trufflehog`. Per constraint, do NOT install new tools.
- `.env` exists in repo root but is gitignored (`.gitignore:9`). Verified `git ls-files .env` returns empty — file is NOT tracked. Do NOT read `.env`; it's the developer's local secrets and out of scope (the audit cares about what's IN git).
- `.env.example` (root) and `docker/.env.example` ARE tracked. They contain placeholder/empty values (`VAPID_PUBLIC_KEY=`, `change_me_please_use_a_long_random_string`). These are EXPECTED templates, not secrets — but verify their values are still placeholders, not real keys someone pasted in.
- Tracked file count: 1839 (`git ls-files | wc -l`). Full history scan with `git log --all -p` will be larger but still tractable.
- Known secret types in this stack (from CLAUDE.md):
  - **VAPID keys** (Web Push, Phase 9) — long-lived, rotation invalidates ALL browser subscriptions. Format: base64url EC P-256 keys. Public ~88 chars `BD…`, private ~43 chars.
  - **Keycloak admin password** + **Keycloak DB password** + **Postgres password** (docker/.env) — rotatable but disruptive.
  - **JWT signing keys** — Keycloak-issued, but check for hardcoded HS256 secrets in NestJS guards/strategies.
  - **OAuth client secrets** — Keycloak client secrets if any service uses confidential client flow.
- VAPID public key IS public (it's literally sent to browsers). VAPID private key is the secret. Treat any base64 BD… match as PUBLIC (note but NOT a secret); the corresponding 43-char private value IS the secret.
- Database seed scripts may contain dev passwords (`schoolflow_dev` per `.env.example:1`). These are LOW severity (well-known dev defaults) but should still be reported.
</environment_facts>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Scan tracked files (HEAD) and write FINDINGS.md skeleton + Working Tree section</name>
  <files>.planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md</files>
  <action>
Scan every tracked file in HEAD for secret patterns. Use ripgrep on `git ls-files`-resolved paths (DO NOT scan node_modules, .git, dist, target — these are not tracked anyway).

**Step 1 — Run scans, save raw output to `/tmp/secret-scan-headXX.txt` (do not commit /tmp output):**

Run each pattern category as a SEPARATE ripgrep invocation so you can attribute hits to a specific risk class. For each, capture file:line:matched-line.

```bash
# Build the file list once
git ls-files > /tmp/scd-tracked.txt

# A. Generic high-confidence prefixes (vendor-issued tokens — almost never false positives)
rg -nIH --no-heading -f /dev/stdin -- $(cat /tmp/scd-tracked.txt) > /tmp/scd-A-vendor.txt 2>/dev/null <<'PATTERNS'
(?i)\b(sk_live|pk_live|sk_test|rk_live|whsec)_[A-Za-z0-9]{16,}
\bAKIA[0-9A-Z]{16}\b
\bASIA[0-9A-Z]{16}\b
\bAIza[0-9A-Za-z_-]{35}\b
\bghp_[A-Za-z0-9]{36}\b
\bgho_[A-Za-z0-9]{36}\b
\bghs_[A-Za-z0-9]{36}\b
\bxox[abprs]-[A-Za-z0-9-]{10,}
PATTERNS

# B. Private key blocks (PEM)
rg -nIH --no-heading -e '-----BEGIN (RSA |EC |OPENSSH |DSA |PGP |ENCRYPTED |)PRIVATE KEY-----' $(cat /tmp/scd-tracked.txt) > /tmp/scd-B-pem.txt 2>/dev/null

# C. JWTs (eyJ… long base64url with two dots)
rg -nIH --no-heading -e '\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b' $(cat /tmp/scd-tracked.txt) > /tmp/scd-C-jwt.txt 2>/dev/null

# D. Database URLs with embedded passwords (any non-empty password between : and @)
rg -nIH --no-heading -e '(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^:\s]+:[^@\s]+@' $(cat /tmp/scd-tracked.txt) > /tmp/scd-D-dburl.txt 2>/dev/null

# E. Hardcoded password / secret / key / token assignments with non-placeholder values.
#    Match KEY=VALUE or KEY: VALUE; then we'll filter placeholders in classification.
rg -nIH --no-heading -e '(?i)(password|passwd|secret|api[_-]?key|access[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["'\'']?[A-Za-z0-9_+/=.\-]{8,}' $(cat /tmp/scd-tracked.txt) > /tmp/scd-E-assign.txt 2>/dev/null

# F. VAPID-shaped values (base64url ~43 chars private, ~88 chars public starting BD).
#    BD… is the public key (NOT a secret) — note but classify as INFO.
#    A bare 43-char base64url after VAPID_PRIVATE_KEY= IS the secret.
rg -nIH --no-heading -e 'VAPID_PRIVATE_KEY\s*[:=]\s*["'\'']?[A-Za-z0-9_-]{40,}' $(cat /tmp/scd-tracked.txt) > /tmp/scd-F-vapid-priv.txt 2>/dev/null
rg -nIH --no-heading -e 'VAPID_PUBLIC_KEY\s*[:=]\s*["'\'']?BD[A-Za-z0-9_-]{80,}' $(cat /tmp/scd-tracked.txt) > /tmp/scd-F-vapid-pub.txt 2>/dev/null

# G. .env files committed by mistake (other than .env.example which is intentional)
git ls-files | rg -e '(^|/)\.env(\.|$)' | rg -v '\.env\.example$' > /tmp/scd-G-envfiles.txt
```

If any of the above ripgrep stdin/heredoc invocations are awkward in the executor's shell (heredoc + `$(cat ...)` argument list with 1839 entries can hit ARG_MAX), fall back to: `rg -nIH --no-heading -e '<pattern>' $(git ls-files | tr '\n' ' ')` per pattern, OR pipe through xargs: `git ls-files | xargs rg -nIH --no-heading -e '<pattern>'`. Pick whichever works first try; document the choice in FINDINGS.md.

**Step 2 — Classify each hit:**

For every line in /tmp/scd-*.txt files, decide:
- **TRUE_POSITIVE** — high-entropy real-looking secret. Severity CRITICAL (vendor key/JWT/PEM private/DB URL with real-looking pw) or HIGH (custom secret with strong entropy).
- **FALSE_POSITIVE** — placeholder (`changeme`, `change_me_please…`, `your-secret-here`, `xxx`, `yyy`, `<value>`, `${...}`, empty after `=`, `example.com`, fixture data with `test`/`dummy`/`mock`), public key (VAPID public BD…), or seeded dev password well-known across the project (`schoolflow_dev`).
- **NEEDS_HUMAN_REVIEW** — looks high-entropy but unclear context (test fixture? real key?). Default to this when uncertain.

Severity guidance:
- CRITICAL: live vendor token, real PEM private key, VAPID_PRIVATE_KEY with non-empty value, DB URL with non-placeholder password.
- HIGH: long base64 in a `*_SECRET=` assignment, long JWT in a non-test file.
- MEDIUM: dev/seed password committed (`schoolflow_dev`-class), JWT in a test fixture, hardcoded admin password in seed.
- LOW: placeholder-shaped but technically matches pattern; documented in CLAUDE.md as expected.
- INFO: VAPID public key (not a secret by design).

**Step 3 — Write `260501-scd-FINDINGS.md` with this structure:**

```markdown
---
quick_id: 260501-scd
audit_date: 2026-05-01
auditor: claude-opus-4-7
scope: tracked-files + full-git-history
tools_used: ripgrep (gitleaks/trufflehog NOT available — declined to install)
---

# Secret Audit Findings — 2026-05-01

## Summary

| Severity | Working Tree | Git History | Total |
|----------|-------------:|------------:|------:|
| CRITICAL | N | N | N |
| HIGH | N | N | N |
| MEDIUM | N | N | N |
| LOW | N | N | N |
| INFO | N | N | N |
| NEEDS_HUMAN_REVIEW | N | N | N |

**Bottom line:** {one of: "No rotation needed." / "Rotation REQUIRED for: <list>." / "N items need human review before deciding."}

**Rotation checklist (only if any CRITICAL/HIGH TRUE_POSITIVE):**
- [ ] {service} — {what to rotate} — {where it lives now}

## Methodology

- Tracked-file scan: `git ls-files` → ripgrep over 7 pattern classes (A–G as defined in plan).
- History scan: `git log --all -p --no-color` piped into ripgrep with the same pattern set.
- Classification rules (placeholder detection, public-key handling, severity tiers): see plan task action.
- Tools available: ripgrep 14.1.1. NOT used: gitleaks, trufflehog (not installed; constraint forbade install).

## Working Tree (HEAD across all branches' tip — actually scan only current HEAD's `git ls-files`; history scan covers other branch tips)

### CRITICAL
{table or "None."}

### HIGH
{table or "None."}

### MEDIUM
{table or "None."}

### LOW / INFO
{collapsed list or "None."}

### NEEDS_HUMAN_REVIEW
{table with full context lines (still redacted) so user can decide}

## Git History

{filled by Task 2 — leave a placeholder heading here}

## False Positives Confirmed

{list of patterns that fired but were correctly ignored — e.g. `change_me_please…` in docker/.env.example, VAPID_PUBLIC_KEY (public by design), seed dev password `schoolflow_dev`}

## Recommendations

1. {actionable item, e.g. "No rotation needed; .env is correctly gitignored."}
2. {e.g. "Add a pre-commit hook running gitleaks (out of scope for this audit)."}
3. {e.g. "Consider committing an empty `docker/.env.example` check to CI to detect accidental swap."}
```

For each TRUE_POSITIVE / NEEDS_HUMAN_REVIEW row in the tables, columns: `File | Line | Pattern class (A–G) | Redacted excerpt | Severity | Recommended action`.

**Redaction rule:** show first 4 + last 4 chars of any matched secret-looking value, e.g. `eyJh…AbCd` (length=NNN). NEVER paste the full value into FINDINGS.md.

Defer the **Git History** subsection to Task 2 — leave the `## Git History` heading with a `_To be filled by history scan._` placeholder so this file's first commit is still useful even if Task 2 fails.
  </action>
  <verify>
    <automated>test -f .planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md && grep -q '^## Summary' .planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md && grep -q '^## Working Tree' .planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md && grep -q '^## Git History' .planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md && grep -q '^## Recommendations' .planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md</automated>
  </verify>
  <done>
FINDINGS.md exists with frontmatter, Summary table populated for Working Tree column, Working Tree subsections (CRITICAL/HIGH/MEDIUM/LOW/INFO/NEEDS_HUMAN_REVIEW) each either populated or marked "None.", Git History heading with placeholder, Recommendations section drafted, False Positives Confirmed section populated. Every TRUE_POSITIVE row uses redacted excerpts. No raw secret values appear anywhere in the report.
  </done>
</task>

<task type="auto">
  <name>Task 2: Scan full git history and finalize FINDINGS.md</name>
  <files>.planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md</files>
  <action>
Scan the FULL git history (all branches, all commits) for the same patterns from Task 1. Secrets removed from HEAD but still in history are equally compromised — any TRUE_POSITIVE here implies the secret was at one point public to anyone who cloned, and rotation is mandatory regardless of whether HEAD is clean.

**Step 1 — Generate the history diff stream once and reuse:**

```bash
# Produce a single text stream of every diff in every commit on every ref.
# This is large but acceptable for a 1839-file repo; if it OOMs, fall back to
# `git log --all --pretty=format:'%H' | while read sha; do git show "$sha"; done`
# piped through the same rg invocations.
git log --all -p --no-color --full-history > /tmp/scd-history.txt
wc -l /tmp/scd-history.txt   # sanity check

# Apply the same A–G pattern set, but capture commit context.
# Use `git log --all -p -G '<regex>'` for each pattern so you get commit hash + author + date attribution per match, instead of bulk-grepping a flat dump.

# A. Vendor prefixes (one git log per regex — they're cheap on this repo size)
for pat in 'sk_(live|test)_' 'pk_live_' 'whsec_' 'AKIA[0-9A-Z]{16}' 'AIza[0-9A-Za-z_-]{35}' 'ghp_[A-Za-z0-9]{36}' 'xox[abprs]-'; do
  echo "=== Pattern: $pat ==="
  git log --all -p -G "$pat" --pretty=format:'COMMIT %H %an %ad %s' --date=short 2>/dev/null | rg -B1 -A0 -e "$pat" || echo "(no hits)"
done > /tmp/scd-hist-A.txt

# B. PEM private keys
git log --all -p -G '-----BEGIN (RSA |EC |OPENSSH |DSA |PGP |ENCRYPTED |)PRIVATE KEY-----' --pretty=format:'COMMIT %H %an %ad %s' --date=short > /tmp/scd-hist-B.txt 2>/dev/null

# C. JWTs
git log --all -p -G 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}' --pretty=format:'COMMIT %H %an %ad %s' --date=short > /tmp/scd-hist-C.txt 2>/dev/null

# D. DB URLs with embedded password
git log --all -p -G '(postgres(ql)?|mysql|mongodb(\+srv)?|redis)://[^:[:space:]]+:[^@[:space:]]+@' --pretty=format:'COMMIT %H %an %ad %s' --date=short > /tmp/scd-hist-D.txt 2>/dev/null

# E. KEY=VALUE secret-shaped assignments
git log --all -p -G '(?i)(password|secret|api[_-]?key|access[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["'\'']?[A-Za-z0-9_+/=.-]{16,}' --pretty=format:'COMMIT %H %an %ad %s' --date=short > /tmp/scd-hist-E.txt 2>/dev/null

# F. VAPID private specifically (highest priority for this stack — the file VAPID rotation invalidates ALL push subscriptions)
git log --all -p -G 'VAPID_PRIVATE_KEY\s*[:=]\s*["'\'']?[A-Za-z0-9_-]{40,}' --pretty=format:'COMMIT %H %an %ad %s' --date=short > /tmp/scd-hist-F.txt 2>/dev/null

# G. Detect any .env (non-example) ever committed in history
git log --all --diff-filter=A --name-only --pretty=format:'COMMIT %H %ad' --date=short 2>/dev/null | rg -e '(^|/)\.env(\.|$)' | rg -v '\.env\.example$' > /tmp/scd-hist-G.txt
```

If `git log -G '<perl-regex>'` rejects POSIX regex differences, fall back to `--pickaxe-regex` mode or simplify the regex (e.g. drop the `(?i)` and run twice). Document any pattern that had to be simplified, in the Methodology section.

**Step 2 — For each hit, extract:**
- commit hash (short, 7 chars)
- author + date (helps user remember context)
- file path within the diff
- redacted excerpt (same 4+4 redaction rule as Task 1)
- whether the value also exists in HEAD (cross-reference Task 1's findings — same string in HEAD = single TRUE_POSITIVE; absent from HEAD = "history-only" finding)

**Step 3 — Edit FINDINGS.md, replacing the `## Git History` placeholder with:**

```markdown
## Git History

Total commits scanned: {N from `git rev-list --all --count`}
Total branches: {N from `git branch -a | wc -l`}

### Currently in HEAD (already reported in Working Tree above)
{count} — see Working Tree section.

### History-only (removed from HEAD, but committed at some point)

#### CRITICAL
| Commit | Date | Author | File | Pattern | Redacted excerpt | Recommended action |
|--------|------|--------|------|---------|------------------|--------------------|
| ...    | ...  | ...    | ...  | ...     | ...              | rotate immediately |

#### HIGH / MEDIUM / LOW / INFO / NEEDS_HUMAN_REVIEW
{same shape, or "None."}

### .env-shaped files ever committed (Pattern G)
{table with commit + path + whether removed in a later commit}
```

**Step 4 — Update the Summary table at the top with Git-History counts and recompute Total. Update the "Bottom line" sentence:**
- If zero CRITICAL/HIGH TRUE_POSITIVE in either column → "No rotation needed."
- If any CRITICAL/HIGH TRUE_POSITIVE in EITHER column → "Rotation REQUIRED for: <enumerated list>."
- If only NEEDS_HUMAN_REVIEW → "{N} items need human review before deciding."

**Step 5 — Update the "Rotation checklist" section if any CRITICAL/HIGH:**
For each rotation item, name the SERVICE (e.g. "VAPID — invalidates all browser push subscriptions"), what to rotate (private key), and operational impact (so user knows what they're signing up for). Reference CLAUDE.md context where relevant (e.g. VAPID rotation → all subscriptions need re-registration).

**Step 6 — Final pass:**
- Verify NO raw secret value (length > 12 chars of high-entropy base64/hex) is in FINDINGS.md. Use `grep -E '[A-Za-z0-9+/_-]{30,}' 260501-scd-FINDINGS.md` and confirm any hit is a redacted form (`xxxx…yyyy`) or a known-public placeholder.
- Replace any literal `SUMMARY-EXAMPLE` or template comments with real numbers.
- If the audit found nothing actionable, the report should still clearly say: "No accidentally committed secrets found in tracked files or git history." That is a valid and valuable outcome.
  </action>
  <verify>
    <automated>grep -q '^## Git History$' .planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md && ! grep -q '_To be filled by history scan._' .planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md && grep -qE '^Total commits scanned: [0-9]+' .planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md && grep -qE '^\*\*Bottom line:\*\*' .planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-FINDINGS.md</automated>
  </verify>
  <done>
Git History section is fully populated (no placeholder text remains). Summary table includes both Working Tree and Git History columns with real numbers. Bottom line sentence is decisive ("No rotation needed." / "Rotation REQUIRED for: …" / "N items need human review"). Rotation checklist reflects actual findings. No raw secret value appears in the file (only redacted `xxxx…yyyy` excerpts or confirmed-public values like VAPID public keys). User can read the report and immediately know: rotate-this, ignore-that, look-deeper-here.
  </done>
</task>

</tasks>

<verification>
Phase-level checks:
- `260501-scd-FINDINGS.md` exists, is well-formed Markdown, and contains all required sections.
- Both Working Tree and Git History columns of the Summary table have integer counts (no `N` placeholders left).
- No raw secret-shaped values longer than 12 chars are present unredacted (manual spot check via `rg -e '[A-Za-z0-9+/_-]{30,}' FINDINGS.md` — every hit must be a redaction marker, a known public key, or a placeholder string from .env.example).
- Recommendations section is non-empty and actionable.
</verification>

<success_criteria>
- User reads `260501-scd-FINDINGS.md` once and knows exactly: (a) whether to rotate any secrets, (b) which secrets and how (referenced by service), (c) which findings are confirmed false positives and why, (d) which (if any) need a human eyeball before deciding.
- Audit is reproducible: Methodology section lists every pattern + tool used, so the same scan can be re-run later (e.g. as part of a pre-commit hook or CI job).
- No new secrets created; no git history rewritten; no working-tree changes outside the FINDINGS.md file (per constraint: history rewriting is out of scope).
</success_criteria>

<output>
After completion, create `.planning/quick/260501-scd-check-nach-versehentlich-comitteten-secr/260501-scd-SUMMARY.md` with: total findings by severity, bottom-line rotation decision, link to FINDINGS.md.
</output>
