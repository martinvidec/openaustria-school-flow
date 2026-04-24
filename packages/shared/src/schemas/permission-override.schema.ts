import { z } from 'zod';

/**
 * Phase 13-01 USER-03 — PermissionOverride CRUD payloads.
 *
 * Mirrors prisma.permissionOverride columns plus the Task-1 additions
 * (`updated_at` auto, `reason` required on write). `conditions` is a
 * free-form JSON record (CASL evaluates JS predicates, no injection
 * vector per threat register T-13-03 / T-13-13).
 *
 * `reason` is REQUIRED on both create AND update — the audit trail
 * (AuditInterceptor) needs a human-readable justification for every
 * override mutation per D-07 / T-13-04.
 */
export const createPermissionOverrideSchema = z.object({
  userId: z.string().min(1, 'Benutzer-ID ist erforderlich'),
  action: z.string().min(1, 'Action ist erforderlich'),
  subject: z.string().min(1, 'Subject ist erforderlich'),
  granted: z.boolean(),
  conditions: z.record(z.string(), z.unknown()).nullable(),
  reason: z.string().min(1, 'Begründung ist erforderlich'),
});

export const updatePermissionOverrideSchema = z.object({
  action: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  granted: z.boolean().optional(),
  conditions: z.record(z.string(), z.unknown()).nullable().optional(),
  reason: z.string().min(1, 'Begründung ist erforderlich'),
});

export type CreatePermissionOverrideInput = z.infer<typeof createPermissionOverrideSchema>;
export type UpdatePermissionOverrideInput = z.infer<typeof updatePermissionOverrideSchema>;
