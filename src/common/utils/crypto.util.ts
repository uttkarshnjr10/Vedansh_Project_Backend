import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

/**
 * Generate a 6-digit cryptographically secure OTP
 */
export function generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hash a value using bcrypt with cost factor 12
 */
export async function hashValue(value: string): Promise<string> {
    return bcrypt.hash(value, 12);
}

/**
 * Compare a plain text value against a bcrypt hash
 */
export async function compareHash(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
}

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Encrypt sensitive data using AES-256-CBC
 * Used for bank details, PAN numbers, etc.
 */
export function encryptSensitive(text: string, key: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    // Ensure key is exactly 32 bytes
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data encrypted with encryptSensitive
 */
export function decryptSensitive(encrypted: string, key: string): string {
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

/**
 * Generate a URL-safe slug from a name with a short random suffix for uniqueness
 */
export function generateSlug(name: string): string {
    const slug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')        // Remove non-word chars except spaces and hyphens
        .replace(/[\s_]+/g, '-')          // Replace spaces and underscores with hyphens
        .replace(/-+/g, '-')              // Remove consecutive hyphens
        .replace(/^-+|-+$/g, '');         // Remove leading/trailing hyphens

    const suffix = crypto.randomBytes(3).toString('hex'); // 6 char hex suffix
    return `${slug}-${suffix}`;
}

/**
 * Generate a unique order number in the format: VAN-YYYYMMDD-XXXXXX
 */
export function generateOrderNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = crypto.randomInt(100000, 999999).toString();
    return `VAN-${year}${month}${day}-${random}`;
}
