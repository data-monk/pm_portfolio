import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

const RaasApp = lazy(() => import('./apps/app-3-raas/RaasApp'))
const CreatorTwinApp = lazy(() => import('./apps/app-1-creator-twin/CreatorTwinApp'))
const VioletCrumbsApp = lazy(() => import('./apps/app-4-violet-crumbs/VioletCrumbsApp'))
const CommuteSearchApp = lazy(() => import('./apps/app-5-commute-search/CommuteSearchApp'))

const AppLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-surface">
    <div className="text-slate-400 text-sm animate-pulse">Loading…</div>
  </div>
)

function App() {
  return (
    <Router>
      <Routes>
        {/* Each app manages its own full-screen layout — no portfolio shell */}

        <Route
          path="/apps/raas/*"
          element={<Suspense fallback={<AppLoading />}><RaasApp /></Suspense>}
        />

        <Route
          path="/apps/creator-twin"
          element={<Suspense fallback={<AppLoading />}><CreatorTwinApp /></Suspense>}
        />

        <Route
          path="/apps/violet-crumbs/*"
          element={<Suspense fallback={<AppLoading />}><VioletCrumbsApp /></Suspense>}
        />

        <Route
          path="/apps/commute-search/*"
          element={<Suspense fallback={<AppLoading />}><CommuteSearchApp /></Suspense>}
        />

        {/* Portfolio shell — landing page only */}
        <Route
          path="*"
          element={
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                </Routes>
              </main>
              <Footer />
            </div>
          }
        />
      </Routes>
    </Router>
  )
}

export default App
