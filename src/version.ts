/**
 * Version and release metadata.
 *
 * The version comes from package.json at build time (Vite define), so the APK,
 * the About screen and the update manifest can never drift apart silently.
 */
export const APP_VERSION = __APP_VERSION__
export const APP_BUILT_AT = __APP_BUILT_AT__

export const APP_NAME = 'Shabh Service'
export const COMPANY_NAME = 'Shabh Creations'
export const WEBSITE_URL = 'https://shabhcreations.com/'

/** Human-facing highlights for the installed build (About → What's new). */
export const RELEASE_NOTES: string[] = [
  'Security: demo PINs are stored as salted PBKDF2 hashes — no plaintext PIN ships in the app bundle.',
  'Sessions now expire after 12 hours, or after 2 hours without interaction, with a clear sign-in notice.',
  'Production builds enforce a strict content security policy and HTTPS-only network access.',
  'Android: backups disabled, WebView file access off, tapjacking taps filtered and remote debugging off in release builds.',
  'Update downloads are validated against the official release repository before opening.',
  'Dashboard, login, camera proof and OTP flows are unchanged.'
]

/** Third-party components. The app itself is proprietary, not open source. */
export const THIRD_PARTY_NOTICES: Array<{ name: string; licence: string }> = [
  { name: 'React', licence: 'MIT' },
  { name: 'React Router', licence: 'MIT' },
  { name: 'Dexie.js', licence: 'Apache-2.0' },
  { name: 'Zustand', licence: 'MIT' },
  { name: 'Tailwind CSS', licence: 'MIT' },
  { name: 'Vite', licence: 'MIT' },
  { name: 'Capacitor', licence: 'MIT' },
  { name: 'Supabase JS', licence: 'Apache-2.0' }
]
