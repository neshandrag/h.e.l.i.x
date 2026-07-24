import { createContext, useContext, useState, useCallback } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('helix_user');
    return raw ? JSON.parse(raw) : null;
  });

  const persist = useCallback((token, nextUser) => {
    localStorage.setItem('helix_token', token);
    localStorage.setItem('helix_user', JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password });
      persist(data.token, data.user);
    },
    [persist]
  );

  const register = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/register', { email, password });
      persist(data.token, data.user);
    },
    [persist]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('helix_token');
    localStorage.removeItem('helix_user');
    setUser(null);
  }, []);

  const setUserProfile = useCallback((nextUser) => {
    setUser((prev) => {
      const merged = { ...(prev || {}), ...nextUser };
      localStorage.setItem('helix_user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, setUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
