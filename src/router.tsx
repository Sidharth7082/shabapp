import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoginScreen } from '@/features/auth/LoginScreen'

/**
 * Screens are split by route so the field workflow ships first and the
 * estimate/admin bundles only load when opened.
 */
const JobsScreen = lazy(() =>
  import('@/features/jobs/JobsScreen').then((module) => ({ default: module.JobsScreen }))
)
const JobDetailScreen = lazy(() =>
  import('@/features/jobs/JobDetailScreen').then((module) => ({
    default: module.JobDetailScreen
  }))
)
const EstimateHub = lazy(() =>
  import('@/features/estimates/EstimateHub').then((module) => ({ default: module.EstimateHub }))
)
const GasWizard = lazy(() =>
  import('@/features/estimates/GasWizard').then((module) => ({ default: module.GasWizard }))
)
const FireAlarmBoqScreen = lazy(() =>
  import('@/features/estimates/FireAlarmBoqScreen').then((module) => ({
    default: module.FireAlarmBoqScreen
  }))
)
const QuotationBuilder = lazy(() =>
  import('@/features/estimates/QuotationBuilder').then((module) => ({
    default: module.QuotationBuilder
  }))
)
const AmcScreen = lazy(() =>
  import('@/features/estimates/AmcScreen').then((module) => ({ default: module.AmcScreen }))
)
const InsightsScreen = lazy(() =>
  import('@/features/insights/InsightsScreen').then((module) => ({
    default: module.InsightsScreen
  }))
)
const AdminScreen = lazy(() =>
  import('@/features/admin/AdminScreen').then((module) => ({ default: module.AdminScreen }))
)
const SettingsScreen = lazy(() =>
  import('@/features/settings/SettingsScreen').then((module) => ({
    default: module.SettingsScreen
  }))
)
const AboutScreen = lazy(() =>
  import('@/features/about/AboutScreen').then((module) => ({ default: module.AboutScreen }))
)

export const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginScreen /> },
    {
      path: '/',
      element: <AppShell />,
      children: [
        { index: true, element: <JobsScreen /> },
        { path: 'jobs/:id', element: <JobDetailScreen /> },
        { path: 'estimates', element: <EstimateHub /> },
        { path: 'estimates/gas', element: <GasWizard /> },
        { path: 'estimates/fire-alarm', element: <FireAlarmBoqScreen /> },
        { path: 'estimates/quotation', element: <QuotationBuilder /> },
        { path: 'estimates/amc', element: <AmcScreen /> },
        { path: 'insights', element: <InsightsScreen /> },
        { path: 'admin', element: <AdminScreen /> },
        { path: 'settings', element: <SettingsScreen /> },
        { path: 'about', element: <AboutScreen /> }
      ]
    }
  ],
  { future: { v7_relativeSplatPath: true } }
)
