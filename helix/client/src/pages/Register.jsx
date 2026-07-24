import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import HelixMark from '../components/HelixMark';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <form onSubmit={onSubmit} className="capsule-panel p-9 shadow-[var(--shadow-glow)]">
          <div className="flex items-center gap-2 mb-1">
            <HelixMark className="w-10 h-10" />
            <span className="font-display text-xl font-semibold tracking-wide text-gradient">HELIX</span>
          </div>
          <p className="text-ink-400 text-sm mb-6">Start building your digital identity.</p>

          <label className="block text-xs text-ink-400 mb-1.5 ml-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 rounded-full bg-ink-800 border border-ink-600 px-5 py-2.5 text-sm outline-none focus:border-violet-500 transition-colors"
          />

          <label className="block text-xs text-ink-400 mb-1.5 ml-1">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-5 rounded-full bg-ink-800 border border-ink-600 px-5 py-2.5 text-sm outline-none focus:border-violet-500 transition-colors"
          />

          {error && <p className="text-red-400 text-xs mb-4 ml-1">{error}</p>}

          <motion.button
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.01 }}
            disabled={loading}
            className="btn-glass-primary w-full rounded-full font-medium py-3 text-sm disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </motion.button>

          <p className="text-xs text-ink-400 mt-5 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300">
              Sign in
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
