/// <reference types="vite/client" />

declare const __APP_VERSION__: string
declare const __APP_BUILT_AT__: string

interface ImportMetaEnv {
  /** Optional override for the update manifest URL (e.g. Supabase storage). */
  readonly VITE_UPDATE_URL?: string
}
