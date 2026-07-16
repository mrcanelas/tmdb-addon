import { Coffee, Heart, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Modal } from '@metalayer/shared-ui';
import { DONATE_OPTIONS } from '@/navigation';

function DonateOptionIcon({ id }: { id: string }) {
  if (id === 'kofi') {
    return <Coffee className="size-4 shrink-0" aria-hidden />;
  }
  return <Heart className="size-4 shrink-0" aria-hidden />;
}

export function DonateModal({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();

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
              <Sparkles className="size-5 text-[var(--accent)]" aria-hidden />
            </Modal.Icon>
            <Modal.Heading>{t('donate.title')}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="gap-4">
            <p className="text-sm text-muted">{t('donate.body')}</p>
            <div className="grid gap-2">
              {DONATE_OPTIONS.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  variant="outline"
                  fullWidth
                  className="justify-start gap-2"
                  onPress={() => {
                    window.open(option.href, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <DonateOptionIcon id={option.id} />
                  {t(option.labelKey)}
                </Button>
              ))}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              type="button"
              variant="outline"
              fullWidth
              slot="close"
              onPress={() => onOpenChange(false)}
            >
              {t('donate.close')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
