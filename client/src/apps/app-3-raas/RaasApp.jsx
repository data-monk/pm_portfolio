import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import DriveConnect from './pages/DriveConnect'
import Documents from './pages/Documents'
import PromptManager from './pages/PromptManager'
import Research from './pages/Research'

function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

export default function RaasApp() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="login" element={<Login />} />

        {/* Admin routes */}
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="admin/drive"
          element={
            <AdminRoute>
              <AdminLayout>
                <DriveConnect />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="admin/docs"
          element={
            <AdminRoute>
              <AdminLayout>
                <Documents />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="admin/prompts"
          element={
            <AdminRoute>
              <AdminLayout>
                <PromptManager />
              </AdminLayout>
            </AdminRoute>
          }
        />

        {/* User research */}
        <Route
          path="research"
          element={
            <ProtectedRoute>
              <Research />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="login" replace />} />
      </Routes>
    </AuthProvider>
  )
}
