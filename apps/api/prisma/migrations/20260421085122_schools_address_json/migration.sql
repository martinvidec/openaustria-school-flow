-- Phase 10.1 Bug 2: convert schools.address from text to jsonb, repairing the one
-- known-corrupt row (seed-school-bgbrg-musterstadt stored '[object Object]' from an
-- accidental toString() on the frontend). Pre-clear any non-JSON strings to NULL so
-- the USING cast does not blow up. After the type change, the seed script re-populates
-- the row with the proper {street,zip,city} object shape.

-- Step 1: null out any row whose address is not valid JSON (covers the '[object Object]'
-- row and any future text row someone might have manually inserted).
UPDATE "schools"
SET "address" = NULL
WHERE "address" IS NOT NULL
  AND NOT (
    "address" ~ '^\s*\{'   -- starts with an object brace
  );

-- Step 2: convert the column type. Use USING to coerce the surviving text values
-- through jsonb::text -- any remaining row must already contain parseable JSON.
ALTER TABLE "schools"
  ALTER COLUMN "address" TYPE jsonb USING
    CASE
      WHEN "address" IS NULL THEN NULL
      ELSE "address"::jsonb
    END;

-- Step 3: explicit belt-and-braces repair for the known seed row in case pre-existing
-- dev DBs skipped Step 1 (e.g. the row was NULL already but the column type change ran).
UPDATE "schools"
SET "address" = NULL
WHERE "id" = 'seed-school-bgbrg-musterstadt'
  AND (
    "address" IS NULL
    OR "address"::text = '"[object Object]"'
  );
