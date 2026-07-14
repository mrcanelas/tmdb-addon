import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs } from '@metalayer/shared-ui';

export interface ModuleTab {
  to: string;
  label: string;
  end?: boolean;
}

function resolveSelectedTab(pathname: string, tabs: ModuleTab[]): string {
  const path = pathname.replace(/\/+$/, '') || '/';

  for (const tab of tabs) {
    if (!tab.end) continue;
    if (path === tab.to || path === `${tab.to}/`) return tab.to;
  }

  const ranked = [...tabs].sort((a, b) => b.to.length - a.to.length);
  for (const tab of ranked) {
    if (path === tab.to || path.startsWith(`${tab.to}/`)) return tab.to;
  }

  return tabs[0]?.to ?? path;
}

/** Shared tab rail for Sources / Catalogs / Metas / Review hubs (HeroUI Tabs). */
export function ModuleTabs({ tabs }: { tabs: ModuleTab[] }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedKey = resolveSelectedTab(location.pathname, tabs);

  return (
    <Tabs
      className="mb-6 w-full"
      variant="secondary"
      selectedKey={selectedKey}
      onSelectionChange={(key) => {
        navigate(String(key));
      }}
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label={t('hub.tabs.aria')}>
          {tabs.map((tab) => (
            <Tabs.Tab key={tab.to} id={tab.to}>
              {tab.label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
}

export function ModuleHub({ tabs }: { tabs: ModuleTab[] }) {
  return (
    <div>
      <ModuleTabs tabs={tabs} />
      <Outlet />
    </div>
  );
}
