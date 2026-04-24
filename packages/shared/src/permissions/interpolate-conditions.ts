/**
 * Phase 13-01 — shared {{ id }} interpolation util.
 *
 * Extracted from apps/api/src/modules/auth/casl/casl-ability.factory.ts so that
 * both CaslAbilityFactory (runtime ability build) and EffectivePermissionsService
 * (read-only resolver, Task 3) share a single implementation — no drift between
 * what a user's ability *is* and what the admin UI *shows* them having.
 *
 * Contract: conditions is a plain `Record<string, unknown>`; only string
 * values get the `{{ id }}` replacement, every other type passes through
 * unchanged. Returns a new object — never mutates the input.
 */
export type InterpolationContext = { id: string };

export function interpolateConditions(
  conditions: Record<string, unknown>,
  context: InterpolationContext,
): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(conditions)) {
    if (typeof value === 'string') {
      // Tolerate whitespace variations: `{{ id }}`, `{{id}}`, `{{  id  }}`.
      parsed[key] = value.replace(/\{\{\s*id\s*\}\}/g, context.id);
    } else {
      parsed[key] = value;
    }
  }
  return parsed;
}
