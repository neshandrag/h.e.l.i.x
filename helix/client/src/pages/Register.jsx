import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

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
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="glass-panel rounded-2xl p-8 w-full max-w-sm shadow-[var(--shadow-glow)]"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🧬</span>
          <span className="text-xl font-semibold text-gradient">Helix</span>
        </div>
        <p className="text-ink-400 text-sm mb-6">Start building your digital identity.</p>

        <label className="block text-xs text-ink-400 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-lg bg-ink-800 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-violet-400 transition-colors"
        />

        <label className="block text-xs text-ink-400 mb-1">Password</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-5 rounded-lg bg-ink-800 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-violet-400 transition-colors"
        />

        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 text-ink-950 font-medium py-2.5 text-sm disabled:opacity-60"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </motion.button>

        <p className="text-xs text-ink-400 mt-5 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-violet-400 hover:text-violet-300">
            Sign in
          </Link>
        </p>
      </motion.form>
    </div>
  );
}
