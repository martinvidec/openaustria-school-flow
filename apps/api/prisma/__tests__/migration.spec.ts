/**
 * Phase 10 Plan 01a — Migration existence + Prisma client typing spec.
 *
 * Purpose: assert that the two Phase 10 migrations exist on disk AND
 * that the regenerated @prisma/client surfaces the new fields
 * (School.abWeekEnabled, SchoolYear.isActive) at the TypeScript type layer.
 *
 * This spec runs WITHOUT a live Postgres connection — it only reads the
 * migrations folder and imports the Prisma Client type namespace. DB-level
 * invariants (partial unique index, backfill) are exercised by
 * school-year-multi-active.spec.ts.
 */
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Prisma } from '../../src/config/database/generated/client';

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

describe('Phase 10 migrations exist on disk', () => {
  it('has migration 10_add_school_ab_week_enabled', () => {
    const entries = readdirSync(MIGRATIONS_DIR);
    const match = entries.find((e) => e.endsWith('_10_add_school_ab_week_enabled'));
    expect(match, 'Expected a migration folder ending with _10_add_school_ab_week_enabled').toBeDefined();
    expect(existsSync(join(MIGRATIONS_DIR, match!, 'migration.sql'))).toBe(true);
  });

  it('has migration 10_school_year_multi_active', () => {
    const entries = readdirSync(MIGRATIONS_DIR);
    const match = entries.find((e) => e.endsWith('_10_school_year_multi_active'));
    expect(match, 'Expected a migration folder ending with _10_school_year_multi_active').toBeDefined();
    expect(existsSync(join(MIGRATIONS_DIR, match!, 'migration.sql'))).toBe(true);
  });

  it('migration 10_school_year_multi_active declares partial unique index', async () => {
    const entries = readdirSync(MIGRATIONS_DIR);
    const match = entries.find((e) => e.endsWith('_10_school_year_multi_active'));
    expect(match).toBeDefined();
    const { readFileSync } = await import('node:fs');
    const sql = readFileSync(join(MIGRATIONS_DIR, match!, 'migration.sql'), 'utf8');
    expect(sql).toMatch(/school_years_active_per_school/);
    expect(sql).toMatch(/WHERE\s+"is_active"\s*=\s*true/i);
  });
});

describe('Prisma client typings expose Phase 10 fields', () => {
  it('School payload surfaces abWeekEnabled: boolean', () => {
    // Compile-time assertion: accessing the field on the default payload
    // must resolve to `boolean`. If the schema change + `prisma generate`
    // did not run, this file fails to compile.
    type DefaultSchool = Prisma.SchoolGetPayload<{}>;
    const _check: (s: DefaultSchool) => boolean = (s) => s.abWeekEnabled;
    expect(typeof _check).toBe('function');
  });

  it('SchoolYear payload surfaces isActive: boolean', () => {
    type DefaultYear = Prisma.SchoolYearGetPayload<{}>;
    const _check: (y: DefaultYear) => boolean = (y) => y.isActive;
    expect(typeof _check).toBe('function');
  });
});
