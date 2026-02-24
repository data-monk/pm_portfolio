import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

const RaasApp = lazy(() => import('./apps/app-3-raas/RaasApp'))

// Placeholder pages for future apps
const AppPlaceholder = ({ name }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-3xl font-bold gradient-text mb-4">{name}</h1>
      <p className="text-slate-400">Coming soon...</p>
    </div>
  </div>
)

const AppLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-slate-400 text-sm animate-pulse">Loading…</div>
  </div>
)

function App() {
  return (
    <Router>
      <Routes>
        {/* RaaS app — manages its own layout (no Navbar/Footer) */}
        <Route
          path="/apps/raas/*"
          element={
            <Suspense fallback={<AppLoading />}>
              <RaasApp />
            </Suspense>
          }
        />

        {/* Main portfolio shell (Navbar + Footer) */}
        <Route
          path="*"
          element={
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/apps/app-1" element={<AppPlaceholder name="Sentiment Analyzer" />} />
                  <Route path="/apps/app-2" element={<AppPlaceholder name="AI Chatbot" />} />
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
