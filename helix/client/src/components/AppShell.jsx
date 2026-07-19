import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function AppShell() {
  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
