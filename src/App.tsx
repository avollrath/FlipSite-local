import { Suspense, lazy } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
 BrowserRouter,
 Navigate,
 Outlet,
 Route,
 Routes,
 useLocation,
} from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from '@/components/layout/Layout'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { ThemeProvider } from '@/lib/theme'
import { Login } from '@/pages/Login'

const queryClient = new QueryClient()
const Analytics = lazy(() =>
 import('@/pages/Analytics').then((module) => ({ default: module.Analytics })),
)
const Categories = lazy(() =>
 import('@/pages/Categories').then((module) => ({ default: module.Categories })),
)
const ImportExport = lazy(() =>
 import('@/pages/ImportExport').then((module) => ({
 default: module.ImportExport,
 })),
)
const Items = lazy(() =>
 import('@/pages/Items').then((module) => ({ default: module.Items })),
)
const Landing = lazy(() =>
 import('@/pages/Landing').then((module) => ({ default: module.Landing })),
)
const PeriodReport = lazy(() =>
 import('@/pages/PeriodReport').then((module) => ({
 default: module.PeriodReport,
 })),
)
const Settings = lazy(() =>
 import('@/pages/Settings').then((module) => ({ default: module.Settings })),
)

function ProtectedRoute() {
 const { user, loading } = useAuth()
 const location = useLocation()

 if (loading) {
 return <StartupLoader />
 }

 if (!user) {
 return <Navigate to="/login" replace state={{ from: location }} />
 }

 return <Outlet />
}

function PublicHomeRoute() {
 const { user, loading } = useAuth()

 if (loading) {
 return <StartupLoader />
 }

 if (user) {
 return <Navigate to="/items" replace />
 }

 return <Landing />
}

function StartupLoader() {
 return (
 <main className="grid min-h-screen place-items-center bg-surface text-base ">
 <div className="flex flex-col items-center gap-4">
  <div className="relative grid h-16 w-16 place-items-center rounded-xl bg-accent text-accent-fg shadow-2xl shadow-accent/20">
  <div className="absolute inset-0 rounded-xl border border-accent-fg/20" />
  <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent-fg/30 border-t-accent-fg" />
  </div>
  <div className="text-center">
  <p className="text-lg font-semibold">FlipSite</p>
  <p className="mt-1 text-sm text-muted ">
  Checking your session
  </p>
  </div>
 </div>
 </main>
)
}

function RouteLoader() {
 return (
 <main className="grid min-h-[50vh] place-items-center bg-surface text-base">
 <div className="h-8 w-8 animate-spin rounded-full border-2 border-layout border-t-accent" />
 </main>
 )
}

function App() {
 return (
 <QueryClientProvider client={queryClient}>
 <ThemeProvider>
  <AuthProvider>
  <BrowserRouter>
  <Toaster richColors position="top-right" theme="system" />
  <Suspense fallback={<RouteLoader />}>
  <Routes>
   <Route path="/" element={<PublicHomeRoute />} />
   <Route path="/landing" element={<PublicHomeRoute />} />
   <Route path="/login" element={<Login />} />
   <Route element={<ProtectedRoute />}>
   <Route element={<Layout />}>
   <Route path="/items" element={<Items />} />
   <Route path="/items/:itemId" element={<Items />} />
   <Route path="/dashboard" element={<Analytics />} />
   <Route path="/analytics" element={<Navigate to="/dashboard" replace />} />
   <Route path="/report" element={<PeriodReport />} />
   <Route path="/categories" element={<Categories />} />
   <Route path="/import-export" element={<ImportExport />} />
   <Route path="/settings" element={<Settings />} />
   </Route>
   </Route>
   <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
  </Suspense>
  </BrowserRouter>
  </AuthProvider>
 </ThemeProvider>
 </QueryClientProvider>
 )
}

export default App
