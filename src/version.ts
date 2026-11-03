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
  'Four roles with separate panels: technician, supervisor, manager and admin.',
  'Technicians only see and open their own visits; supervisors get live team status and job assignment.',
  'Managers get team points, weekly performance, time on site and per-person job lists.',
  'Admins get a separate admin console for people & roles, the audit log and security.',
  'Audit log records sign-ins, failed attempts, role changes, job actions and demo resets.',
  'Demo accounts: two one-tap technicians; supervisor, manager and admin require ID + PIN.',
  'Reset demo data once to load the new seeded Sana and Rohan jobs.'
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
