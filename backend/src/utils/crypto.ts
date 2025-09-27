import crypto from 'crypto';

export class CryptoUtils {
  // Generate random string
  public static generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate secure random ID
  public static generateSecureId(): string {
    return crypto.randomUUID();
  }

  // Hash data with SHA256
  public static sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Create HMAC signature
  public static createHmac(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  // Verify HMAC signature
  public static verifyHmac(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.createHmac(data, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  // Encrypt data
  public static encrypt(text: string, key: string): { encrypted: string; iv: string } {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
    };
  }

  // Decrypt data
  public static decrypt(encryptedData: { encrypted: string; iv: string }, key: string): string {
    const algorithm = 'aes-256-cbc';
    const decipher = crypto.createDecipher(algorithm, key);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}