import { Prisma } from '../../../config/database/generated/client.js';
import { EncryptionService } from './encryption.service';

/**
 * Map of model names to fields that should be encrypted at rest (D-16).
 *
 * Per D-16: Only encrypt phone, address, dateOfBirth, socialSecurityNumber, healthData.
 * Do NOT encrypt firstName, lastName, email (needed for queries/indexes).
 */
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  Person: ['phone', 'address', 'dateOfBirth', 'socialSecurityNumber', 'healthData'],
};

function encryptFields(
  encryptionService: EncryptionService,
  modelName: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const fields = ENCRYPTED_FIELDS[modelName];
  if (!fields || !encryptionService.isConfigured()) {
    return data;
  }

  const result = { ...data };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string' && !encryptionService.isEncrypted(value)) {
      result[field] = encryptionService.encrypt(value);
    }
  }
  return result;
}

function decryptResult(
  encryptionService: EncryptionService,
  modelName: string,
  result: unknown,
): unknown {
  if (!result || !encryptionService.isConfigured()) {
    return result;
  }

  const fields = ENCRYPTED_FIELDS[modelName];
  if (!fields) {
    return result;
  }

  if (Array.isArray(result)) {
    return result.map((item) => decryptSingleResult(encryptionService, fields, item));
  }

  return decryptSingleResult(encryptionService, fields, result);
}

function decryptSingleResult(
  encryptionService: EncryptionService,
  fields: string[],
  record: unknown,
): unknown {
  if (!record || typeof record !== 'object') {
    return record;
  }

  const obj = record as Record<string, unknown>;
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string' && encryptionService.isEncrypted(value)) {
      result[field] = encryptionService.decrypt(value);
    }
  }
  return result;
}

/**
 * Creates a Prisma client extension that transparently encrypts/decrypts
 * specified fields on Person model using AES-256-GCM (D-17).
 *
 * If encryption service is not configured, passes through without encrypting.
 */
export function createEncryptionExtension(encryptionService: EncryptionService) {
  return Prisma.defineExtension({
    name: 'field-encryption',
    query: {
      person: {
        async create({ args, query }) {
          if (args.data) {
            args.data = encryptFields(encryptionService, 'Person', args.data as Record<string, unknown>) as typeof args.data;
          }
          const result = await query(args);
          return decryptResult(encryptionService, 'Person', result);
        },
        async update({ args, query }) {
          if (args.data) {
            args.data = encryptFields(encryptionService, 'Person', args.data as Record<string, unknown>) as typeof args.data;
          }
          const result = await query(args);
          return decryptResult(encryptionService, 'Person', result);
        },
        async upsert({ args, query }) {
          if (args.create) {
            args.create = encryptFields(encryptionService, 'Person', args.create as Record<string, unknown>) as typeof args.create;
          }
          if (args.update) {
            args.update = encryptFields(encryptionService, 'Person', args.update as Record<string, unknown>) as typeof args.update;
          }
          const result = await query(args);
          return decryptResult(encryptionService, 'Person', result);
        },
        async findUnique({ args, query }) {
          const result = await query(args);
          return decryptResult(encryptionService, 'Person', result);
        },
        async findFirst({ args, query }) {
          const result = await query(args);
          return decryptResult(encryptionService, 'Person', result);
        },
        async findMany({ args, query }) {
          const result = await query(args);
          return decryptResult(encryptionService, 'Person', result);
        },
      },
    },
  });
}
