import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Graph from './pages/Graph';
import Timeline from './pages/Timeline';
import Ask from './pages/Ask';
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/graph" element={<Graph />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/ask" element={<Ask />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}
