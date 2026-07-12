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
import { AppearancePage } from '@/pages/AppearancePage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { CONFIGURE_NAV } from '@/navigation';
import { AppQueryProvider } from '@/providers/AppQueryProvider';
import { useConfigureUiStore } from '@/stores/ui-store';

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
    item.path !== '/search-ai' &&
    item.path !== '/appearance',
);

function ThemedApp() {
  const theme = useConfigureUiStore((s) => s.theme);

  return (
    <MetaLayerThemeProvider theme={theme}>
      <AppQueryProvider>
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
              <Route path="appearance" element={<AppearancePage />} />
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
      </AppQueryProvider>
    </MetaLayerThemeProvider>
  );
}

export function App() {
  return <ThemedApp />;
}
