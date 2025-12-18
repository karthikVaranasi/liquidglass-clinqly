import { useNavigation } from "@/contexts/navigation-context"
import { lazy, Suspense } from "react"
import { useAuth } from "@/hooks/use-auth"

// Lazy load page components
const AdminAnalyticsPage = lazy(() => import("@/components/adminpages/analytics-page").then(module => ({ default: module.AnalyticsPage })))
const AdminMFASettingsPage = lazy(() => import("@/components/adminpages/mfa-settings-page").then(module => ({ default: module.MFASettingsPage })))
const DoctorAnalyticsPage = lazy(() => import("@/components/doctorpages/analytics-page").then(module => ({ default: module.AnalyticsPage })))
const NotFoundPage = lazy(() => import("@/components/not-found-page").then(module => ({ default: module.NotFoundPage })))

// Wrapper components that inject onPageChange from navigation context
export function AdminAnalyticsPageWrapper() {
  const { navigateToPage } = useNavigation()
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AdminAnalyticsPage onPageChange={navigateToPage} />
    </Suspense>
  )
}

export function AdminMFASettingsPageWrapper() {
  const { navigateToPage } = useNavigation()
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AdminMFASettingsPage onPageChange={navigateToPage} />
    </Suspense>
  )
}

export function DoctorAnalyticsPageWrapper() {
  const { navigateToPage } = useNavigation()
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <DoctorAnalyticsPage onPageChange={navigateToPage} />
    </Suspense>
  )
}

export function NotFoundPageWrapper() {
  const { role } = useAuth()
  const userType = (role as 'admin' | 'doctor') || 'doctor'
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <NotFoundPage userType={userType} />
    </Suspense>
  )
}

