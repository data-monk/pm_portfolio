import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminRoute({ children }) {
  const { isAuthed, user } = useAuth()

  if (!isAuthed) return <Navigate to="/apps/raas/login" replace />
  if (user?.role !== 'ADMIN') return <Navigate to="/apps/raas/research" replace />
  return children
}
