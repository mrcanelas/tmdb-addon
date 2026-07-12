import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { OverviewPage } from '@/pages/OverviewPage';
import { SourcesPage } from '@/pages/SourcesPage';
import { CatalogStudioPage } from '@/pages/CatalogStudioPage';
import { RulesPage } from '@/pages/RulesPage';
import { SortingPage } from '@/pages/SortingPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { CONFIGURE_NAV } from '@/navigation';

const PLACEHOLDER_ROUTES = CONFIGURE_NAV.filter(
  (item) =>
    item.path !== '/' &&
    item.path !== '/sources' &&
    item.path !== '/catalog-studio' &&
    item.path !== '/rules' &&
    item.path !== '/sorting',
);

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="sources" element={<SourcesPage />} />
          <Route path="catalog-studio" element={<CatalogStudioPage />} />
          <Route path="rules" element={<RulesPage />} />
          <Route path="sorting" element={<SortingPage />} />
          {PLACEHOLDER_ROUTES.map((item) => (
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
