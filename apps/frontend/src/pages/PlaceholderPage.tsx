import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/metalayer/PageHeader';

interface PlaceholderPageProps {
  titleKey: string;
}

export function PlaceholderPage({ titleKey }: PlaceholderPageProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-3">
      <PageHeader title={t(titleKey)} description={t('placeholder.body')} />
      <p className="ml-text-muted lg:hidden">{t('placeholder.body')}</p>
    </section>
  );
}
