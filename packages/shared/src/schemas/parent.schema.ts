import { z } from 'zod';

/**
 * Parent schemas — Phase 12-01 shared Zod validation (STUDENT-02).
 *
 * ParentModule is a Phase 12 greenfield module. Consumed by:
 *   - ParentSearchPopover (email search + 404 inline-create fallback)
 *   - InlineCreateParentForm (RHF zodResolver for create payload)
 *   - useParents hook
 */

export const ParentStammdatenSchema = z.object({
  firstName: z.string().min(1, 'Pflichtfeld').max(100),
  lastName: z.string().min(1, 'Pflichtfeld').max(100),
  email: z.string().email('Gültige E-Mail-Adresse eingeben'),
  phone: z.string().optional(),
});

export const ParentCreateSchema = ParentStammdatenSchema.extend({
  schoolId: z.string().uuid(),
});

export const ParentUpdateSchema = ParentStammdatenSchema.partial();

export const ParentSearchSchema = z.object({
  schoolId: z.string().uuid(),
  email: z.string().optional(),
  name: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type ParentStammdatenInput = z.infer<typeof ParentStammdatenSchema>;
export type ParentCreateInput = z.infer<typeof ParentCreateSchema>;
export type ParentUpdateInput = z.infer<typeof ParentUpdateSchema>;
export type ParentSearchInput = z.infer<typeof ParentSearchSchema>;
