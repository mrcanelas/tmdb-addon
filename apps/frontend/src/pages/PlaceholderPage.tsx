import { useTranslation } from 'react-i18next';
import { usePageHeader } from '@/contexts/page-title';

interface PlaceholderPageProps {
  titleKey: string;
}

export function PlaceholderPage({ titleKey }: PlaceholderPageProps) {
  const { t } = useTranslation();
  usePageHeader(t(titleKey), t('placeholder.body'));

  return (
    <section className="space-y-3">
      <p className="ml-text-muted lg:hidden">{t('placeholder.body')}</p>
    </section>
  );
}
