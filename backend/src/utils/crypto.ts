import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { config } from '../config';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateApiKey(): string {
  return `cvault_${crypto.randomBytes(24).toString('base64url')}`;
}

export function generateApiSecret(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export async function hashApiSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, SALT_ROUNDS);
}

export async function verifyApiSecret(secret: string, hash: string): Promise<boolean> {
  return bcrypt.compare(secret, hash);
}

// Encrypt device private keys before storing
export function encryptPrivateKey(privateKey: string): string {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(config.apiEncryptionKey, 'hex');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptPrivateKey(encryptedData: string): string {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(config.apiEncryptionKey, 'hex');
  
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// IP address utilities
export function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

export function intToIp(int: number): string {
  return [
    (int >>> 24) & 0xFF,
    (int >>> 16) & 0xFF,
    (int >>> 8) & 0xFF,
    int & 0xFF
  ].join('.');
}

export function getNextAvailableIp(allocatedIps: string[]): string | null {
  const startInt = ipToInt(config.ipPoolStart);
  const endInt = ipToInt(config.ipPoolEnd);
  const allocated = new Set(allocatedIps.map(ipToInt));
  
  for (let i = startInt; i <= endInt; i++) {
    if (!allocated.has(i)) {
      return intToIp(i);
    }
  }
  
  return null; // Pool exhausted
}
