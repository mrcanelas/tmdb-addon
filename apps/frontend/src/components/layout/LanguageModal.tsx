import { Languages } from 'lucide-react';
import { applyDocumentLocale, LOCALE_REGISTRY } from '@metalayer/i18n';
import {
  Button,
  Modal,
  Radio,
  RadioGroup,
} from '@metalayer/shared-ui';
import { useTranslation } from 'react-i18next';

const UI_LOCALES = LOCALE_REGISTRY.filter(
  (locale) => locale.status === 'stable',
);

export function LanguageModal({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, i18n } = useTranslation();

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      variant="blur"
      isDismissable
    >
      <Modal.Container size="sm" placement="center">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-default text-foreground">
              <Languages className="size-5" aria-hidden />
            </Modal.Icon>
            <Modal.Heading>{t('shell.languageModal.title')}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <p className="text-sm text-muted">
              {t('shell.languageModal.description')}
            </p>
            <RadioGroup
              className="mt-4"
              aria-label={t('shell.locale.aria')}
              value={i18n.language}
              onChange={(value) => {
                void i18n.changeLanguage(value);
                applyDocumentLocale(value);
                onOpenChange(false);
              }}
            >
              {UI_LOCALES.map((locale) => (
                <Radio key={locale.id} value={locale.id}>
                  <Radio.Content>
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                    <span className="flex flex-1 items-center justify-between gap-3">
                      <span>{locale.displayName}</span>
                      <span className="text-xs text-muted">{locale.id}</span>
                    </span>
                  </Radio.Content>
                </Radio>
              ))}
            </RadioGroup>
          </Modal.Body>
          <Modal.Footer>
            <Button
              type="button"
              variant="outline"
              fullWidth
              slot="close"
              onPress={() => onOpenChange(false)}
            >
              {t('shell.languageModal.close')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
