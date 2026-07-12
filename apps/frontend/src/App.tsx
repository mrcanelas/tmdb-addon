import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MetaLayerThemeProvider } from '@metalayer/shared-ui';
import { AppShell } from '@/components/layout/AppShell';
import { OverviewPage } from '@/pages/OverviewPage';
import { SourcesPage } from '@/pages/SourcesPage';
import { CatalogStudioPage } from '@/pages/CatalogStudioPage';
import { RulesPage } from '@/pages/RulesPage';
import { SortingPage } from '@/pages/SortingPage';
import { InspectorPage } from '@/pages/InspectorPage';
import { TrackingPage } from '@/pages/TrackingPage';
import { CorrectionsPage } from '@/pages/CorrectionsPage';
import { SearchAiPage } from '@/pages/SearchAiPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { CONFIGURE_NAV } from '@/navigation';

const PLACEHOLDER_ROUTES = CONFIGURE_NAV.filter(
  (item) =>
    item.path !== '/' &&
    item.path !== '/sources' &&
    item.path !== '/catalog-studio' &&
    item.path !== '/rules' &&
    item.path !== '/sorting' &&
    item.path !== '/inspector' &&
    item.path !== '/tracking' &&
    item.path !== '/corrections' &&
    item.path !== '/search-ai',
);

export function App() {
  return (
    <MetaLayerThemeProvider theme="dark">
      <BrowserRouter basename="/configure">
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="sources" element={<SourcesPage />} />
            <Route path="catalog-studio" element={<CatalogStudioPage />} />
            <Route path="catalogs" element={<CatalogStudioPage />} />
            <Route path="rules" element={<RulesPage />} />
            <Route path="sorting" element={<SortingPage />} />
            <Route path="inspector" element={<InspectorPage />} />
            <Route path="tracking" element={<TrackingPage />} />
            <Route path="corrections" element={<CorrectionsPage />} />
            <Route path="search-ai" element={<SearchAiPage />} />
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
    </MetaLayerThemeProvider>
  );
}
