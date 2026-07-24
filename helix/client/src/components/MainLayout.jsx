
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function MainLayout() {
  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar />
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
