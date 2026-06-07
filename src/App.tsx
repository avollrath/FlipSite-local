import { Suspense, lazy } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from '@/components/layout/Layout'
import { ThemeProvider } from '@/lib/theme'

const queryClient = new QueryClient()
const Analytics = lazy(() => import('@/pages/Analytics').then(({ Analytics }) => ({ default: Analytics })))
const Categories = lazy(() => import('@/pages/Categories').then(({ Categories }) => ({ default: Categories })))
const ImportExport = lazy(() => import('@/pages/ImportExport').then(({ ImportExport }) => ({ default: ImportExport })))
const Items = lazy(() => import('@/pages/Items').then(({ Items }) => ({ default: Items })))
const PeriodReport = lazy(() => import('@/pages/PeriodReport').then(({ PeriodReport }) => ({ default: PeriodReport })))
const Settings = lazy(() => import('@/pages/Settings').then(({ Settings }) => ({ default: Settings })))

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Toaster richColors position="top-right" theme="system" />
          <Suspense fallback={<main className="grid min-h-[50vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-layout border-t-accent" /></main>}>
            <Routes>
              <Route path="/" element={<Navigate to="/items" replace />} />
              <Route element={<Layout />}>
                <Route path="/items" element={<Items />} />
                <Route path="/items/:itemId" element={<Items />} />
                <Route path="/dashboard" element={<Analytics />} />
                <Route path="/analytics" element={<Navigate to="/dashboard" replace />} />
                <Route path="/activity-report" element={<PeriodReport />} />
                <Route path="/report" element={<Navigate to="/activity-report" replace />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/import-export" element={<ImportExport />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
