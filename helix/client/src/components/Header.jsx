import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import HelixMark from './HelixMark';

const links = [
  { to: '/dashboard', label: 'Documents' },
  { to: '/graph', label: 'Relationship Graph' },
  { to: '/timeline', label: 'Journey Timeline' },
  { to: '/ask', label: 'Ask Your Identity' },
];

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <div className="max-w-6xl mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-3 glass-panel rounded-full pl-6 pr-3 py-4 shadow-[var(--shadow-glow)]">
        <NavLink to="/dashboard" className="flex items-center gap-2.5 shrink-0 justify-self-start">
          <HelixMark className="w-9 h-9" />
          <span className="font-display text-lg font-semibold tracking-wide text-gradient-brand hidden sm:inline">
            HELIX
          </span>
        </NavLink>

        <nav className="flex items-center gap-1 justify-self-center overflow-x-auto no-scrollbar max-w-full">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `relative px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'text-ink-50' : 'text-ink-400 hover:text-ink-50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="header-active"
                      className="absolute inset-0 rounded-full btn-glass-active"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3 pl-2 shrink-0 justify-self-end">
          <p className="text-xs text-ink-400 truncate max-w-[9rem] hidden lg:block">{user?.email}</p>
          <button onClick={logout} className="btn-glass text-xs px-3.5 py-2 rounded-full">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
