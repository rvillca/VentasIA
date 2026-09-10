import { SavedBiometricDevice } from '../types';

export const STORAGE_BIO_DEVICE_KEY = 'chiquiminisos_biometric_device';

/**
 * Checks if the current browser environment supports the standard WebAuthn API.
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    !!navigator.credentials &&
    !!navigator.credentials.create &&
    !!navigator.credentials.get
  );
}

/**
 * Checks if a platform authenticator (Touch ID, Windows Hello, Android Biometrics, Face ID)
 * is available on this specific device.
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return isAvailable;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts ArrayBuffer to URL-safe Base64 string
 */
export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Converts URL-safe Base64 string to ArrayBuffer
 */
export function base64UrlToBuffer(base64Url: string): ArrayBuffer {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Detects a human-friendly label for the current device and browser
 */
export function getFriendlyDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Este Dispositivo';
  const ua = navigator.userAgent;
  let os = 'Dispositivo';

  if (/iPhone|iPad|iPod/i.test(ua)) {
    os = /iPad/i.test(ua) ? 'iPad (Touch ID / Face ID)' : 'iPhone (Face ID / Touch ID)';
  } else if (/Android/i.test(ua)) {
    os = 'Celular / Tablet Android (Sensor de Huella)';
  } else if (/Windows/i.test(ua)) {
    os = 'Computadora Windows (Windows Hello)';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'MacBook / Mac (Touch ID)';
  } else if (/Linux/i.test(ua)) {
    os = 'Equipo Linux (Biometría)';
  }

  let browser = '';
  if (/Chrome|CriOS/i.test(ua) && !/Edg|OPR/i.test(ua)) browser = 'Chrome';
  else if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox|FxiOS/i.test(ua)) browser = 'Firefox';

  return browser ? `${os} • ${browser}` : os;
}

/**
 * Retrieve saved biometric device credentials from localStorage for this browser
 */
export function getSavedBiometricDevice(): SavedBiometricDevice | null {
  try {
    const raw = localStorage.getItem(STORAGE_BIO_DEVICE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.credentialId || !parsed.uid) return null;
    return parsed as SavedBiometricDevice;
  } catch {
    return null;
  }
}

/**
 * Save biometric device record to localStorage
 */
export function saveBiometricDevice(device: SavedBiometricDevice): void {
  try {
    localStorage.setItem(STORAGE_BIO_DEVICE_KEY, JSON.stringify(device));
  } catch (err) {
    console.error('Error saving biometric device to localStorage:', err);
  }
}

/**
 * Remove biometric device registration from localStorage
 */
export function removeSavedBiometricDevice(): void {
  try {
    localStorage.removeItem(STORAGE_BIO_DEVICE_KEY);
  } catch {}
}

/**
 * Register a new Passkey / Biometric credential on this device using WebAuthn.
 * This triggers the browser/OS biometric prompt (fingerprint or face).
 */
export async function registerBiometricPasskey(user: {
  uid: string;
  email: string;
  displayName?: string;
}): Promise<{
  credentialId: string;
  deviceName: string;
  createdAt: string;
}> {
  if (!isWebAuthnSupported()) {
    throw new Error(
      'Tu navegador o dispositivo no soporta la tecnología WebAuthn para huella digital.'
    );
  }

  // Generate a random 32-byte cryptographic challenge
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  const userIdBytes = new TextEncoder().encode(user.uid);
  const deviceName = getFriendlyDeviceName();

  const hostname = window.location.hostname;

  const publicKeyCredentialCreationOptions: CredentialCreationOptions = {
    publicKey: {
      challenge,
      rp: {
        name: 'Importadora Chiquiminisos',
        ...(hostname ? { id: hostname } : {}),
      },
      user: {
        id: userIdBytes,
        name: user.email,
        displayName: user.displayName || user.email,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256 (ECDSA with P-256)
        { alg: -257, type: 'public-key' }, // RS256 (RSA with SHA-256)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Enforce local device platform sensor
        userVerification: 'required', // Enforce biometric verification (fingerprint, face, or PIN)
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  };

  let credential: any;
  try {
    credential = await navigator.credentials.create(publicKeyCredentialCreationOptions);
  } catch (err: any) {
    console.error('WebAuthn creation error:', err);
    if (err.name === 'NotAllowedError') {
      const msg = err.message || '';
      if (
        msg.includes('publickey-credentials') ||
        msg.includes('Permissions Policy') ||
        msg.includes('cross-origin') ||
        msg.includes('feature is not enabled')
      ) {
        throw new Error(
          'Por restricciones de seguridad del navegador en visores (iframe), abre la app en una nueva pestaña directa para usar el sensor de huella.'
        );
      }
      throw new Error('Verificación biométrica cancelada o sensor no reconocido.');
    }
    if (err.name === 'InvalidStateError') {
      throw new Error('Este sensor de huella ya está registrado para este usuario en este equipo.');
    }
    if (err.name === 'SecurityError') {
      throw new Error(
        'Por restricciones de seguridad del navegador dentro de marcos (iframe), por favor abre el sistema en una nueva pestaña o ventana directa para usar el sensor de huella.'
      );
    }
    throw new Error(err.message || 'No se pudo vincular la huella digital en este dispositivo.');
  }

  if (!credential || !credential.rawId) {
    throw new Error('El sensor biométrico no devolvió una credencial válida.');
  }

  const credentialId = bufferToBase64Url(credential.rawId);
  const createdAt = new Date().toISOString();

  // Save to this device's local storage
  saveBiometricDevice({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email,
    credentialId,
    deviceName,
    registeredAt: createdAt,
  });

  return {
    credentialId,
    deviceName,
    createdAt,
  };
}

/**
 * Authenticates using the registered Passkey / Biometric credential.
 * Prompts the user with the native Touch ID / Windows Hello / Android biometric scanner.
 */
export async function verifyBiometricPasskey(
  credentialId?: string
): Promise<{ success: boolean; credentialId: string }> {
  if (!isWebAuthnSupported()) {
    throw new Error('Autenticación biométrica no soportada en este navegador.');
  }

  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  const hostname = window.location.hostname;

  const publicKeyRequestOptions: CredentialRequestOptions = {
    publicKey: {
      challenge,
      ...(hostname ? { rpId: hostname } : {}),
      allowCredentials: credentialId
        ? [
            {
              id: base64UrlToBuffer(credentialId),
              type: 'public-key',
              transports: ['internal'],
            },
          ]
        : undefined,
      userVerification: 'required',
      timeout: 60000,
    },
  };

  let assertion: any;
  try {
    assertion = await navigator.credentials.get(publicKeyRequestOptions);
  } catch (err: any) {
    console.error('WebAuthn get error:', err);
    if (err.name === 'NotAllowedError') {
      const msg = err.message || '';
      if (
        msg.includes('publickey-credentials') ||
        msg.includes('Permissions Policy') ||
        msg.includes('cross-origin') ||
        msg.includes('feature is not enabled')
      ) {
        throw new Error(
          'Por restricciones de seguridad del navegador en visores (iframe), abre la app en una nueva pestaña directa para usar el sensor de huella.'
        );
      }
      throw new Error('Verificación biométrica cancelada o huella no reconocida.');
    }
    if (err.name === 'SecurityError') {
      throw new Error(
        'Por restricciones de seguridad dentro de marcos (iframe), abre el sistema en una nueva pestaña para usar la huella.'
      );
    }
    throw new Error(err.message || 'Error al verificar la huella digital.');
  }

  if (!assertion || !assertion.rawId) {
    throw new Error('No se pudo validar la huella digital.');
  }

  const verifiedId = bufferToBase64Url(assertion.rawId);
  return {
    success: true,
    credentialId: verifiedId,
  };
}
