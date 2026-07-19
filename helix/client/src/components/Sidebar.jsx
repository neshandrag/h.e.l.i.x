import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Documents', icon: '📄' },
  { to: '/graph', label: 'Relationship Graph', icon: '🕸️' },
  { to: '/timeline', label: 'Journey Timeline', icon: '📈' },
  { to: '/ask', label: 'Ask Your Identity', icon: '💬' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 glass-panel border-r border-white/5 flex flex-col p-6">
      <div className="flex items-center gap-2 mb-10">
        <span className="text-2xl">🧬</span>
        <span className="text-xl font-semibold text-gradient tracking-tight">Helix</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isActive ? 'text-ink-50' : 'text-ink-400 hover:text-ink-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-violet-500/15 border border-violet-500/30"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{link.icon}</span>
                <span className="relative z-10">{link.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="pt-4 border-t border-white/5">
        <p className="text-xs text-ink-400 truncate mb-2">{user?.email}</p>
        <button
          onClick={logout}
          className="text-xs text-ink-400 hover:text-ink-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
