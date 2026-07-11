import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { OverviewPage } from '@/pages/OverviewPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { CONFIGURE_NAV } from '@/navigation';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          {CONFIGURE_NAV.filter((item) => item.path !== '/').map((item) => (
            <Route
              key={item.id}
              path={item.path.slice(1)}
              element={<PlaceholderPage titleKey={item.labelKey} />}
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
