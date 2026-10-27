import { Outlet } from 'react-router-dom';
import { Mast } from './Mast';

export function SiteLayout() {
  return (
    <div className="relative min-h-dvh">
      <Mast />
      <main className="min-h-dvh">
        <Outlet />
      </main>
    </div>
  );
}
