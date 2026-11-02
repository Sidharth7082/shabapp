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
  'Employee sign-in with a daily shift target: one completed house is one point.',
  'Customer credit tiers: tier 1 gives a 60-minute visit, tier 2 gives 90 minutes.',
  'The customer’s start OTP starts the visit clock; a separate work-done OTP closes the visit.',
  'Live before/after photos are required for every service — gallery uploads are blocked.',
  'New checklists: CCTV, chimney, RO, geyser and meter, alongside AC, solar and fire systems.',
  'Control room team locator shows the technician’s last check-in or sign-off position.',
  'In-app update check: the app tells you when a new build is available and links to it.'
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
