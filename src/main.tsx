import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { UpdatePrompt } from '@/features/about/UpdatePrompt'
import { ensureSeed } from '@/db/seed'
import '@/styles/index.css'

void ensureSeed()

// Ask the browser to keep IndexedDB (jobs + photo blobs) instead of evicting it.
if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  void navigator.storage.persist().catch(() => undefined)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
      <UpdatePrompt />
    </ErrorBoundary>
  </StrictMode>
)

// Warm the secondary route chunks once the device is idle so the first tap on
// "Estimate", "Insights" or "Control" shows the screen instead of a skeleton.
// Skipped when the user asked to save data.
function prefetchRouteChunks() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (connection?.saveData) return
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
