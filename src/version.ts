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
  'New dashboard: alerts, today’s overview with points % of target, pending services by job, quick actions and a seven-day points chart.',
  'Service board search by customer, job ID, location or status, with Active / Today / Overdue / History / All filters.',
  'Upcoming schedule with arrival estimates and quick access to recently completed visits.',
  'Login hardening: field validation, loading state, attempt limit with a 30-second lockout, forgot-PIN help and “keep me signed in”.',
  'One completed house is one point; tier 1 visits run 60 minutes, tier 2 run 90.',
  'Start and work-done OTPs, live before/after photos with a burned watermark, and offline-first storage stay unchanged.',
  'Brand mark on the login screen, header and update sheet; the help sheet loads only when needed.'
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
