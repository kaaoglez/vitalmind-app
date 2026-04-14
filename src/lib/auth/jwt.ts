const JWT_SECRET = process.env.JWT_SECRET || 'vitalmind-dev-secret-key-2024-change-in-production';
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

function base64UrlEncode(data: string): string {
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return atob(base64);
}

async function getSigningKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(JWT_SECRET);
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Date.now();
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRY,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const message = `${encodedHeader}.${encodedPayload}`;

  const key = await getSigningKey();
  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const encodedSignature = base64UrlEncode(
    signatureArray.map(b => String.fromCharCode(b)).join('')
  );

  return `${message}.${encodedSignature}`;
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const message = `${encodedHeader}.${encodedPayload}`;

    const key = await getSigningKey();
    const encoder = new TextEncoder();

    // Decode the signature back to bytes
    const signatureStr = base64UrlDecode(encodedSignature);
    const signatureArray = new Uint8Array(signatureStr.length);
    for (let i = 0; i < signatureStr.length; i++) {
      signatureArray[i] = signatureStr.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureArray,
      encoder.encode(message)
    );

    if (!isValid) return null;

    const payload: JwtPayload = JSON.parse(base64UrlDecode(encodedPayload));

    // Check expiration
    if (payload.exp && Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

export const COOKIE_NAME = 'vitalmind-token';

export function getTokenMaxAge(): number {
  return 7 * 24 * 60 * 60; // 7 days in seconds
}
