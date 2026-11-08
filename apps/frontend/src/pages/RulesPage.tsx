import { useTranslation } from 'react-i18next';
import { usePageHeader } from '@/contexts/page-title';
import { GlobalRulesEditor } from '@/components/catalogs/GlobalRulesEditor';

export function RulesPage() {
  const { t } = useTranslation(['rules', 'common']);
  usePageHeader(t('rules.title'), t('rules.intro'));

  return (
    <section>
      <GlobalRulesEditor />
    </section>
  );
}
