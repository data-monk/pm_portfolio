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
    <aside className="w-56 flex-shrink-0 bg-surface-card border-r border-surface-border min-h-screen flex flex-col">
      <div className="p-5 border-b border-surface-border">
        <p className="text-xs font-bold tracking-widest text-neon-blue uppercase">RaaS Admin</p>
        <p className="text-slate-400 text-xs mt-1 truncate">{user?.email}</p>
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
                  ? 'bg-neon-blue/10 text-neon-blue font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
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
                isActive
                  ? 'bg-neon-purple/10 text-neon-purple font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
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
