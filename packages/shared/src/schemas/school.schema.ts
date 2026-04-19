import { z } from 'zod';

/**
 * Austrian school types per UI-SPEC §3.2 (Phase 10).
 * Locked by CONTEXT.md D-15; mirrored in Prisma SchoolType enum.
 */
export const SCHOOL_TYPES = [
  'VS',
  'NMS',
  'AHS',
  'BHS',
  'BMS',
  'PTS',
  'ASO',
] as const;

export const SchoolTypeEnum = z.enum(SCHOOL_TYPES);
export type SchoolType = z.infer<typeof SchoolTypeEnum>;

/**
 * PLZ regex accepts 4-digit (Austrian) and 5-digit (German) postal codes
 * per UI-SPEC §3.2 (DACH scope).
 */
export const AddressSchema = z.object({
  street: z.string().min(1, 'Pflichtfeld'),
  zip: z.string().regex(/^\d{4,5}$/, 'PLZ muss 4 oder 5 Ziffern haben'),
  city: z.string().min(1, 'Pflichtfeld'),
});

export type AddressInput = z.infer<typeof AddressSchema>;

/**
 * SchoolDetailsSchema: v1.1 Schulstammdaten form validation.
 * Error strings are user-facing German copy (UI-SPEC §13.4).
 */
export const SchoolDetailsSchema = z.object({
  name: z.string().min(1, 'Name erforderlich'),
  schoolType: SchoolTypeEnum,
  address: AddressSchema,
});

export type SchoolDetailsInput = z.infer<typeof SchoolDetailsSchema>;
