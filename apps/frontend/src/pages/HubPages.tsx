import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { Button, Drawer } from '@metalayer/shared-ui';
import { ModuleHub } from '@/components/layout/ModuleHub';
import { FieldRail } from '@/components/fields/FieldRail';
import { parseFieldQueryParam, type FieldRailId } from '@/lib/field-registry';

/** Sources hub — no Providers/Tracking/Search rail; pages own their own UI. */
export function SourcesHubPage() {
  return <Outlet />;
}

/** Catalogs hub — Studio is the only surface; rules live in the catalog edit modal. */
export function CatalogsHubPage() {
  return <Outlet />;
}

export function MetasHubPage() {
  const { t } = useTranslation(['resolution', 'common']);
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedId = parseFieldQueryParam(
    new URLSearchParams(location.search).get('field'),
  );

  function selectField(id: FieldRailId) {
    navigate(`/metas/fields?field=${encodeURIComponent(id)}`);
  }

  const rail = (
    <FieldRail
      selectedId={selectedId}
      query={query}
      onQueryChange={setQuery}
      onSelect={selectField}
      onNavigate={() => setDrawerOpen(false)}
    />
  );

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="xl:hidden"
        onPress={() => setDrawerOpen(true)}
      >
        <Menu className="size-4" aria-hidden />
        {t('resolution.sidebar.open')}
      </Button>

      <div className="flex min-w-0 items-start gap-4">
        <aside className="sticky top-0 hidden h-[calc(100dvh-8.25rem)] w-[260px] shrink-0 xl:block">
          {rail}
        </aside>
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>

      <Drawer isOpen={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Backdrop isDismissable variant="blur" className="xl:hidden">
          <Drawer.Content
            placement="left"
            className="w-[min(100vw-2rem,18rem)] max-w-[18rem] border-0 bg-transparent p-0 shadow-none xl:hidden"
          >
            <Drawer.Dialog
              aria-label={t('resolution.sidebar.aria')}
              className="flex h-dvh flex-col rounded-none border-0 bg-[var(--background)] p-0 shadow-xl outline-none"
            >
              <Drawer.CloseTrigger className="absolute end-3 top-3 z-20" />
              <Drawer.Body className="min-h-0 flex-1 p-3">
                {rail}
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}

export function ReviewHubPage() {
  const { t } = useTranslation();
  return (
    <ModuleHub
      tabs={[
        { to: '/review/inspector', label: t('hub.review.tab.inspector') },
        { to: '/review/corrections', label: t('hub.review.tab.corrections') },
        { to: '/review/diagnostics', label: t('hub.review.tab.diagnostics') },
      ]}
    />
  );
}
