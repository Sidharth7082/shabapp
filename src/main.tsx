import { StrictMode, Suspense, lazy, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ensureSeed } from '@/db/seed'
import '@/styles/index.css'

const UpdatePrompt = lazy(() =>
  import('@/features/about/UpdatePrompt').then((module) => ({ default: module.UpdatePrompt }))
)

function DeferredUpdates() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const idle = (window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
    }).requestIdleCallback
    if (idle) return void idle(() => setReady(true), { timeout: 2500 })
    const timer = window.setTimeout(() => setReady(true), 1500)
    return () => window.clearTimeout(timer)
  }, [])

  if (!ready) return null
  return (
    <Suspense fallback={null}>
      <UpdatePrompt />
    </Suspense>
  )
}

void ensureSeed()

// Ask the browser to keep IndexedDB (jobs + photo blobs) instead of evicting it.
if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  void navigator.storage.persist().catch(() => undefined)
}

// Older APK builds registered the caching PWA service worker, which served
// stale JS after an app update. Native builds now emit a self-destroying
// service worker; this also clears any registration and caches left behind.
const nativeRuntime = Boolean(
  (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
)
if (nativeRuntime && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  void navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch(() => undefined)
  if (typeof caches !== 'undefined') {
    void caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => undefined)
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
      <DeferredUpdates />
    </ErrorBoundary>
  </StrictMode>
)

// Warm the secondary route chunks once the device is idle so the first tap on
// "Estimate", "Insights" or "Control" shows the screen instead of a skeleton.
// Skipped on data-saver and low-memory devices so cheap phones stay responsive.
function deviceCanPrefetch(): boolean {
  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { saveData?: boolean }
  }
  if (nav.connection?.saveData) return false
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) return false
  if ((navigator.hardwareConcurrency ?? 8) <= 4) return false
  return true
}

function prefetchRouteChunks() {
  if (!deviceCanPrefetch()) return
  void import('@/features/estimates/EstimateHub')
  void import('@/features/insights/InsightsScreen')
  void import('@/features/admin/AdminScreen')
  void import('@/features/settings/SettingsScreen')
  void import('@/features/about/AboutScreen')
}

if (typeof window !== 'undefined') {
  const idle = (window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  }).requestIdleCallback
  if (idle) idle(prefetchRouteChunks, { timeout: 4000 })
  else setTimeout(prefetchRouteChunks, 2500)
}
