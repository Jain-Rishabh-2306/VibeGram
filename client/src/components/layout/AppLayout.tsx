import { Outlet } from 'react-router-dom';
import { Sidebar, MobileNav } from './Navigation';

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-bg">
      <Sidebar />
      <main className="md:ml-64 pb-20 md:pb-0 min-h-dvh">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}

