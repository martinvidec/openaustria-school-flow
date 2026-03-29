import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = '$enc:v1:';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SALT = 'schoolflow-salt-v1';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly derivedKey: Buffer | null;

  constructor(private readonly config: ConfigService) {
    const rawKey = this.config.get<string>('SCHOOLFLOW_ENCRYPTION_KEY');
    if (rawKey) {
      this.derivedKey = scryptSync(rawKey, SALT, KEY_LENGTH);
    } else {
      this.derivedKey = null;
      this.logger.warn(
        'SCHOOLFLOW_ENCRYPTION_KEY not configured -- field encryption is disabled. Set this in production!',
      );
    }
  }

  isConfigured(): boolean {
    return this.derivedKey !== null;
  }

  isEncrypted(value: string): boolean {
    return value.startsWith(PREFIX);
  }

  encrypt(plaintext: string): string {
    if (!this.derivedKey) {
      return plaintext;
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.derivedKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    if (!this.derivedKey) {
      return ciphertext;
    }

    if (!this.isEncrypted(ciphertext)) {
      return ciphertext;
    }

    const parts = ciphertext.slice(PREFIX.length).split(':');
    if (parts.length !== 3) {
      this.logger.warn('Invalid encrypted value format -- returning as-is');
      return ciphertext;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;

    const iv = Buffer.from(ivHex!, 'hex');
    const authTag = Buffer.from(authTagHex!, 'hex');
    const decipher = createDecipheriv(ALGORITHM, this.derivedKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex!, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
