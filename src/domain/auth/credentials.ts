/**
 * PIN hashing for the demo directory.
 *
 * The PIN is never stored or shipped in plaintext: each employee record holds a
 * PBKDF2-SHA256 hash with a random 16-byte salt. This raises the bar for anyone
 * unpacking the APK, but it is NOT a substitute for server-side authentication —
 * a determined attacker with the bundle can still brute-force a 4-digit PIN
 * offline. Production: Supabase Auth verifies credentials server-side and the
 * client only holds a short-lived session token. See docs/SECURITY-OTP-CAMERA.md.
 */

export const PIN_ITERATIONS = 210_000
const SALT_BYTES = 16
const HASH_BITS = 256

export interface PinCredential {
  salt: string
  hash: string
  iterations: number
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('WebCrypto is unavailable in this context')
  const key = await subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits'
  ])
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt: new Uint8Array(salt), iterations, hash: 'SHA-256' },
    key,
    HASH_BITS
  )
  return bytesToBase64(new Uint8Array(bits))
}

/** Hash a new PIN. Pass an existing salt only for deterministic tests. */
export async function hashPin(
  pin: string,
  salt?: Uint8Array,
  iterations = PIN_ITERATIONS
): Promise<PinCredential> {
  const saltBytes = salt ?? globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  if (saltBytes.length < SALT_BYTES) throw new Error('Salt is too short')
  const hash = await derive(pin, saltBytes, iterations)
  return { salt: bytesToBase64(saltBytes), hash, iterations }
}

/** Constant-time string comparison so verification does not leak a prefix. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return diff === 0
}

/** Verify a PIN against a stored credential. Fails closed on any error. */
export async function verifyPin(pin: string, credential: PinCredential): Promise<boolean> {
  try {
    const candidate = await derive(pin, base64ToBytes(credential.salt), credential.iterations)
    return timingSafeEqual(candidate, credential.hash)
  } catch {
    return false
  }
}
