import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

const ISSUER = 'Chiquiminisos';

/**
 * Generate a new random Base32 TOTP secret
 */
export function generateTotpSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

/**
 * Build the standard otpauth:// URI for QR code generation
 */
export function buildTotpUri(email: string, secretBase32: string): string {
  const cleanEmail = email.trim().toLowerCase();
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: cleanEmail,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });

  return totp.toString();
}

/**
 * Generate a QR code image as a Data URL from a TOTP URI
 */
export async function generateQrCodeDataUrl(uri: string, isDark: boolean = false): Promise<string> {
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
    color: {
      dark: '#1A2B5C',
      light: '#FFFFFF',
    },
  });
}

/**
 * Validate a 6-digit TOTP code against the base32 secret.
 * Allows a window of 1 step (±30 seconds) to account for slight clock drift.
 */
export function verifyTotpCode(secretBase32: string, token: string): boolean {
  if (!secretBase32 || !token) return false;
  const cleanToken = token.replace(/\s+/g, '').trim();
  if (cleanToken.length !== 6) return false;

  try {
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });

    const delta = totp.validate({
      token: cleanToken,
      window: 1,
    });

    return delta !== null;
  } catch (err) {
    console.error('Error verifying TOTP code:', err);
    return false;
  }
}

/**
 * Helper to get remaining seconds in the current 30-second TOTP window
 */
export function getTotpRemainingSeconds(): number {
  const epoch = Math.floor(Date.now() / 1000);
  return 30 - (epoch % 30);
}
