import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ProfileModal from './ProfileModal';

const links = [
  { to: '/dashboard', label: 'Documents' },
  { to: '/graph', label: 'Relationship Graph' },
  { to: '/timeline', label: 'Journey Timeline' },
  { to: '/ask', label: 'Ask Your Identity' },
];

function UserIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5.5 19.25c.9-3.1 3.2-4.75 6.5-4.75s5.6 1.65 6.5 4.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LogoutIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 7V6.5A2.5 2.5 0 0 1 12.5 4h5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 10 17.5V17"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M4 12h10m0 0-3.25-3.25M14 12l-3.25 3.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Header() {
  const { logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <div className="max-w-6xl mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-3 glass-panel rounded-full pl-6 pr-3 py-3.5 shadow-[var(--shadow-glow)]">
        <NavLink to="/dashboard" className="shrink-0 justify-self-start">
          <span className="font-display text-lg font-semibold tracking-wide text-gradient-brand">HELIX</span>
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

        <div className="flex items-center gap-1.5 pl-2 shrink-0 justify-self-end">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="btn-glass w-9 h-9 rounded-full inline-flex items-center justify-center"
            aria-label="Profile"
            title="Profile"
          >
            <UserIcon />
          </button>
          <button
            type="button"
            onClick={logout}
            className="btn-glass w-9 h-9 rounded-full inline-flex items-center justify-center"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogoutIcon />
          </button>
        </div>
      </div>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </header>
  );
}
