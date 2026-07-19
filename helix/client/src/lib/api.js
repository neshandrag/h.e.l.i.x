import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('helix_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A stale/invalid session (e.g. token from before a dev database reset) gets a
// clean 401 from the server (see auth.middleware.js) — bounce to login instead
// of leaving the app stuck on a failed request.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('helix_token');
      localStorage.removeItem('helix_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
