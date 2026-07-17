import { useTranslation } from 'react-i18next';
import {
  ChevronsDown,
  ChevronsUp,
  Eye,
  EyeOff,
  Home,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@metalayer/shared-ui';

export function CatalogBulkBar({
  count,
  busy,
  onEnable,
  onDisable,
  onShowInHome,
  onHideInHome,
  onMoveToTop,
  onMoveToBottom,
  onDelete,
  onClear,
}: {
  count: number;
  busy: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onShowInHome: () => void;
  onHideInHome: () => void;
  onMoveToTop: () => void;
  onMoveToBottom: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation('catalogs');

  return (
    <div
      className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm"
      role="toolbar"
      aria-label={t('catalogs.bulk.aria')}
    >
      <span className="me-1 text-sm font-medium text-[var(--foreground)]">
        {t('catalogs.bulk.selected', { count })}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        isDisabled={busy}
        onPress={onEnable}
      >
        <Eye className="size-4" aria-hidden />
        {t('catalogs.actions.enable')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        isDisabled={busy}
        onPress={onDisable}
      >
        <EyeOff className="size-4" aria-hidden />
        {t('catalogs.actions.disable')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        isDisabled={busy}
        onPress={onShowInHome}
      >
        <Home className="size-4" aria-hidden />
        {t('catalogs.actions.showInHome')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        isDisabled={busy}
        onPress={onHideInHome}
      >
        <Home className="size-4 opacity-50" aria-hidden />
        {t('catalogs.actions.hideInHome')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        isDisabled={busy}
        onPress={onMoveToTop}
      >
        <ChevronsUp className="size-4" aria-hidden />
        {t('catalogs.bulk.moveToTop')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        isDisabled={busy}
        onPress={onMoveToBottom}
      >
        <ChevronsDown className="size-4" aria-hidden />
        {t('catalogs.bulk.moveToBottom')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        isDisabled={busy}
        className="text-[var(--danger)]"
        onPress={onDelete}
      >
        <Trash2 className="size-4" aria-hidden />
        {t('catalogs.actions.delete')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        isDisabled={busy}
        className="ms-auto"
        onPress={onClear}
        aria-label={t('catalogs.bulk.clear')}
      >
        <X className="size-4" aria-hidden />
        {t('catalogs.bulk.clear')}
      </Button>
    </div>
  );
}
