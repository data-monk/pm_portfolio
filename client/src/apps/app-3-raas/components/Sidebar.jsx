import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const adminLinks = [
  { to: '/apps/raas/admin', label: 'Dashboard', end: true },
  { to: '/apps/raas/admin/drive', label: 'Drive Connect' },
  { to: '/apps/raas/admin/docs', label: 'Documents' },
  { to: '/apps/raas/admin/prompts', label: 'System Prompts' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/apps/raas/login')
  }

  return (
    <aside className="w-56 flex-shrink-0 min-h-screen flex flex-col border-r border-surface-border"
      style={{ background: '#0d1a1e' }}>
      <div className="p-5 border-b border-surface-border">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#0891B2' }} />
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#0891B2' }}>
            RaaS Admin
          </p>
        </div>
        <p className="text-slate-400 text-xs mt-1 truncate pl-4">{user?.email}</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {adminLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
            style={({ isActive }) => isActive
              ? { color: '#0891B2', background: 'rgba(14,116,144,0.12)' }
              : {}
            }
          >
            {link.label}
          </NavLink>
        ))}

        <div className="pt-3 border-t border-surface-border mt-3">
          <NavLink
            to="/apps/raas/research"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'font-medium' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
            style={({ isActive }) => isActive
              ? { color: '#0891B2', background: 'rgba(14,116,144,0.12)' }
              : {}
            }
          >
            Research
          </NavLink>
        </div>
      </nav>

      <div className="p-3 border-t border-surface-border">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-red-400 transition-colors rounded-lg"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
