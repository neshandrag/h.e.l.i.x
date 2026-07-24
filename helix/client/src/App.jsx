import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Graph from './pages/Graph';
import Timeline from './pages/Timeline';
import Ask from './pages/Ask';
import Search from './pages/Search';
import Public from './pages/Public';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import StarfieldBackground from './components/StarfieldBackground';
import SplashScreen from './components/SplashScreen';

export default function App() {
  const [booting, setBooting] = useState(true);

  return (
    <>
      <StarfieldBackground />
      {booting && <SplashScreen onDone={() => setBooting(false)} />}

      {!booting && (
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/u/:username" element={<Public />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/search" element={<Search />} />
              <Route path="/graph" element={<Graph />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/ask" element={<Ask />} />
            </Route>
          </Routes>
        </AnimatePresence>
      )}
    </>
  );
}
