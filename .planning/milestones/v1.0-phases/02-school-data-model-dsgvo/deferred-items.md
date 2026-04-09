# Deferred Items - Phase 02

## Pre-existing Build Errors (out of scope for 02-07)

These TypeScript strict-type errors exist in DSGVO module files from Plans 05/06. Tests pass via SWC (Vitest) but `nest build` (TSC) fails:

1. **`src/modules/dsgvo/dsgvo.module.ts:50`** - `cron` does not exist in type `RepeatOptions` (BullMQ type mismatch)
2. **`src/modules/dsgvo/export/data-export.service.ts:204`** - `PersonExportData` not assignable to `InputJsonValue` (Prisma JSON type)
3. **`src/modules/dsgvo/deletion/data-deletion.service.ts:130`** - `unknown` not assignable to `InputJsonValue` (Prisma JSON type)

These need to be fixed in a follow-up task (type assertions for Prisma JSON fields, BullMQ cron config).
