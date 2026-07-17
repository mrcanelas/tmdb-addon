import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MetaLayerThemeProvider, Toast } from '@metalayer/shared-ui';
import { AppShell } from '@/components/layout/AppShell';
import { OverviewPage } from '@/pages/OverviewPage';
import { SourcesPage } from '@/pages/SourcesPage';
import { CatalogStudioPage } from '@/pages/CatalogStudioPage';
import { InspectorPage } from '@/pages/InspectorPage';
import { TrackingPage } from '@/pages/TrackingPage';
import { CorrectionsPage } from '@/pages/CorrectionsPage';
import { SearchAiPage } from '@/pages/SearchAiPage';
import { AppearancePage } from '@/pages/AppearancePage';
import { LanguageRegionPage } from '@/pages/LanguageRegionPage';
import { SaveInstallPage } from '@/pages/SaveInstallPage';
import { ProfilesPage } from '@/pages/ProfilesPage';
import { AdvancedPage } from '@/pages/AdvancedPage';
import { TrackingOAuthCallbackPage } from '@/pages/TrackingOAuthCallbackPage';
import {
  CatalogsHubPage,
  MetasHubPage,
  ReviewHubPage,
  SourcesHubPage,
} from '@/pages/HubPages';
import { CONFIGURE_LEGACY_REDIRECTS } from '@/navigation';
import { AppQueryProvider } from '@/providers/AppQueryProvider';
import { useConfigureUiStore } from '@/stores/ui-store';

function ThemedApp() {
  const theme = useConfigureUiStore((s) => s.theme);

  return (
    <MetaLayerThemeProvider theme={theme}>
      <Toast.Provider placement="bottom end" />
      <AppQueryProvider>
        <BrowserRouter basename="/configure">
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<OverviewPage />} />

              <Route path="sources" element={<SourcesHubPage />}>
                <Route index element={<SourcesPage />} />
                <Route path="tracking" element={<TrackingPage />} />
                <Route path="search" element={<SearchAiPage />} />
              </Route>

              <Route path="catalogs" element={<CatalogsHubPage />}>
                <Route index element={<CatalogStudioPage />} />
                <Route path="studio" element={<Navigate to="/catalogs" replace />} />
                <Route path="rules" element={<Navigate to="/catalogs" replace />} />
                <Route path="order" element={<Navigate to="/catalogs" replace />} />
              </Route>

              <Route path="metas" element={<MetasHubPage />}>
                <Route index element={<Navigate to="fields" replace />} />
                <Route path="fields" element={<AppearancePage />} />
                <Route path="language" element={<LanguageRegionPage />} />
                <Route path="appearance" element={<AppearancePage />} />
              </Route>

              <Route path="profiles" element={<ProfilesPage />} />

              <Route path="review" element={<ReviewHubPage />}>
                <Route index element={<Navigate to="inspector" replace />} />
                <Route path="inspector" element={<InspectorPage />} />
                <Route path="corrections" element={<CorrectionsPage />} />
                <Route path="diagnostics" element={<AdvancedPage />} />
              </Route>

              <Route path="save-install" element={<SaveInstallPage />} />

              <Route
                path="oauth/:provider/callback"
                element={<TrackingOAuthCallbackPage />}
              />

              {CONFIGURE_LEGACY_REDIRECTS.map((item) => (
                <Route
                  key={item.from}
                  path={item.from.slice(1)}
                  element={<Navigate to={item.to} replace />}
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
