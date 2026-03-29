import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  describe('with encryption key configured', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          EncryptionService,
          {
            provide: ConfigService,
            useValue: {
              get: (key: string) => {
                if (key === 'SCHOOLFLOW_ENCRYPTION_KEY') {
                  return 'test-encryption-key-for-unit-tests';
                }
                return undefined;
              },
            },
          },
        ],
      }).compile();

      service = module.get<EncryptionService>(EncryptionService);
    });

    it('should report as configured', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should encrypt and decrypt a string (roundtrip)', () => {
      const plaintext = 'Sensitive phone number: +43 1 234567';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce encrypted output starting with $enc:v1:', () => {
      const encrypted = service.encrypt('test data');
      expect(encrypted.startsWith('$enc:v1:')).toBe(true);
    });

    it('should pass through non-encrypted strings on decrypt', () => {
      const plaintext = 'not encrypted at all';
      const result = service.decrypt(plaintext);
      expect(result).toBe(plaintext);
    });

    it('should correctly identify encrypted values', () => {
      const encrypted = service.encrypt('test');
      expect(service.isEncrypted(encrypted)).toBe(true);
      expect(service.isEncrypted('plain text')).toBe(false);
      expect(service.isEncrypted('')).toBe(false);
    });

    it('should produce different ciphertexts for the same plaintext (non-deterministic IV)', () => {
      const plaintext = 'same input every time';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);
      expect(encrypted1).not.toBe(encrypted2);

      // Both should still decrypt to the same plaintext
      expect(service.decrypt(encrypted1)).toBe(plaintext);
      expect(service.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const encrypted = service.encrypt('');
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    it('should handle Unicode characters', () => {
      const plaintext = 'Muellerstrasse 42, Wien';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('without encryption key', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          EncryptionService,
          {
            provide: ConfigService,
            useValue: {
              get: () => undefined,
            },
          },
        ],
      }).compile();

      service = module.get<EncryptionService>(EncryptionService);
    });

    it('should report as not configured', () => {
      expect(service.isConfigured()).toBe(false);
    });

    it('should pass through plaintext when not configured', () => {
      const plaintext = 'sensitive data';
      expect(service.encrypt(plaintext)).toBe(plaintext);
      expect(service.decrypt(plaintext)).toBe(plaintext);
    });
  });
});
