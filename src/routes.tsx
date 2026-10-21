import { Navigate, useRoutes } from 'react-router-dom';
import type { ReactElement } from 'react';
import Home from '@/pages/Home';
import Onboarding from '@/pages/Onboarding';
import Trace from '@/pages/Trace';
import Settings from '@/pages/Settings';
import { useSettingsStore } from '@/store/useSettingsStore';

function RequireOnboarding({ children }: { children: ReactElement }): ReactElement {
  const completed = useSettingsStore((state) => state.hasCompletedOnboarding);
  if (!completed) return <Navigate to="/onboarding" replace />;
  return children;
}

export function AppRoutes() {
  return useRoutes([
    {
      path: '/',
      element: (
        <RequireOnboarding>
          <Home />
        </RequireOnboarding>
      ),
    },
    { path: '/onboarding', element: <Onboarding /> },
    { path: '/trace', element: <Trace /> },
    { path: '/settings', element: <Settings /> },
    { path: '*', element: <Navigate to="/" replace /> },
  ]);
}
