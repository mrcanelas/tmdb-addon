import { useTranslation } from 'react-i18next';

interface PlaceholderPageProps {
  titleKey: string;
}

export function PlaceholderPage({ titleKey }: PlaceholderPageProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-3">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t(titleKey)}</h1>
      <p className="ml-text-muted">{t('placeholder.body')}</p>
    </section>
  );
}
