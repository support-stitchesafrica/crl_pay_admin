import * as crypto from 'crypto';

export function generateApiKey(): string {
  return `pk_${crypto.randomBytes(24).toString('hex')}`;
}

export function generateApiSecret(): string {
  return `sk_${crypto.randomBytes(32).toString('hex')}`;
}

export function hashApiSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}
