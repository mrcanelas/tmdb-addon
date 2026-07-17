import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Check,
  ChevronsDown,
  ChevronsUp,
  Eye,
  EyeOff,
  GripVertical,
  Home,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button, Chip, Table, Tooltip } from '@metalayer/shared-ui';
import type { CatalogListItem } from '@/lib/api';
import { cn } from '@/lib/utils';

function IconTip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip delay={200} closeDelay={0}>
      <Tooltip.Trigger>{children}</Tooltip.Trigger>
      <Tooltip.Content placement="top" offset={6} showArrow>
        <Tooltip.Arrow />
        {label}
      </Tooltip.Content>
    </Tooltip>
  );
}

export function CatalogStudioRow({
  catalog,
  displayName,
  index,
  total,
  selected,
  active,
  busy,
  onToggleSelect,
  onActivate,
  onToggleEnabled,
  onToggleHome,
  onMoveToTop,
  onMoveToBottom,
  onRename,
  onDelete,
  onDuplicate,
  onTags,
  onGroup,
}: {
  catalog: CatalogListItem;
  displayName: string;
  index: number;
  total: number;
  selected: boolean;
  active: boolean;
  busy: boolean;
  onToggleSelect: () => void;
  onActivate: () => void;
  onToggleEnabled: () => void;
  onToggleHome: () => void;
  onMoveToTop: () => void;
  onMoveToBottom: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onTags: () => void;
  onGroup: () => void;
}) {
  const { t } = useTranslation('catalogs');
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: catalog.instanceId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Table.Row
      id={catalog.instanceId}
      ref={setNodeRef}
      style={style}
      className={cn(
        'group transition-colors',
        isDragging && 'z-30 opacity-90 shadow-lg ring-2 ring-[var(--accent)]/40',
        !catalog.enabled && 'opacity-60',
        selected && 'bg-[var(--accent)]/5',
        active && 'bg-[var(--accent)]/10 ring-1 ring-inset ring-[var(--accent)]/60',
      )}
    >
      <Table.Cell>
        <div className="flex items-center gap-1">
          <button
            type="button"
            role="checkbox"
            aria-checked={selected}
            aria-label={t('catalogs.row.select', { name: displayName })}
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
              selected
                ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]'
                : 'border-[var(--border)] hover:border-[var(--accent)]',
            )}
            onClick={(event) => {
              event.stopPropagation();
              onToggleSelect();
            }}
          >
            {selected ? <Check className="size-3.5" aria-hidden /> : null}
          </button>

          <button
            type="button"
            className="cursor-grab touch-none p-1 text-[var(--muted-foreground)] active:cursor-grabbing"
            aria-label={t('catalogs.row.drag')}
            {...attributes}
            {...listeners}
            onClick={(event) => event.stopPropagation()}
          >
            <GripVertical className="size-5" aria-hidden />
          </button>
        </div>
      </Table.Cell>

      <Table.Cell>
        <div className="flex min-w-0 items-center gap-1 sm:min-w-[180px]">
          <button
            type="button"
            className={cn(
              'min-w-0 truncate rounded-md text-start font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
              catalog.enabled ? 'text-[var(--foreground)]' : 'ml-text-muted',
            )}
            onClick={onActivate}
          >
            {displayName}
          </button>
          <button
            type="button"
            className="shrink-0 rounded p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            aria-label={t('catalogs.actions.rename')}
            onClick={onRename}
          >
            <Pencil className="size-3.5" aria-hidden />
          </button>
          {catalog.merge ? (
            <Chip size="sm" variant="soft" color="default">
              {t('catalogs.badge.merged')}
            </Chip>
          ) : null}
          {catalog.rotation ? (
            <Chip size="sm" variant="soft" color="default">
              {t('catalogs.badge.rotated')}
            </Chip>
          ) : null}
        </div>
      </Table.Cell>

      <Table.Cell className="hidden sm:table-cell">
        <Chip size="sm" variant="soft" color="accent">
          {catalog.provider}
        </Chip>
      </Table.Cell>

      <Table.Cell className="hidden sm:table-cell">
        <Chip size="sm" variant="soft" color="default">
          {t(`catalogs.type.${catalog.mediaType}`)}
        </Chip>
      </Table.Cell>

      <Table.Cell>
        <div className="flex min-w-[120px] items-center justify-end gap-0.5 sm:min-w-[250px]">
          <IconTip
            label={
              catalog.enabled
                ? t('catalogs.actions.disable')
                : t('catalogs.actions.enable')
            }
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              isIconOnly
              isDisabled={busy}
              aria-label={
                catalog.enabled
                  ? t('catalogs.actions.disable')
                  : t('catalogs.actions.enable')
              }
              onPress={onToggleEnabled}
            >
              {catalog.enabled ? (
                <Eye className="size-5 text-[var(--success)]" aria-hidden />
              ) : (
                <EyeOff className="size-5 ml-text-muted" aria-hidden />
              )}
            </Button>
          </IconTip>
          <IconTip
            label={
              catalog.showInHome
                ? t('catalogs.actions.hideInHome')
                : t('catalogs.actions.showInHome')
            }
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              isIconOnly
              isDisabled={busy || !catalog.enabled}
              aria-label={
                catalog.showInHome
                  ? t('catalogs.actions.hideInHome')
                  : t('catalogs.actions.showInHome')
              }
              onPress={onToggleHome}
            >
              <Home
                className={cn(
                  'size-5',
                  catalog.showInHome && catalog.enabled
                    ? 'text-sky-500'
                    : 'ml-text-muted',
                )}
                aria-hidden
              />
            </Button>
          </IconTip>
          <div className="hidden items-center sm:flex">
            <IconTip label={t('catalogs.bulk.moveToTop')}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                isIconOnly
                isDisabled={busy || index === 0}
                aria-label={t('catalogs.actions.moveUpNamed', {
                  name: displayName,
                })}
                onPress={onMoveToTop}
              >
                <ChevronsUp className="size-5" aria-hidden />
              </Button>
            </IconTip>
            <IconTip label={t('catalogs.bulk.moveToBottom')}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                isIconOnly
                isDisabled={busy || index === total - 1}
                aria-label={t('catalogs.actions.moveDownNamed', {
                  name: displayName,
                })}
                onPress={onMoveToBottom}
              >
                <ChevronsDown className="size-5" aria-hidden />
              </Button>
            </IconTip>
          </div>
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label={t('catalogs.row.more')}
              aria-expanded={menuOpen}
              onPress={() => setMenuOpen((open) => !open)}
            >
              <MoreHorizontal className="size-5" aria-hidden />
            </Button>
            {menuOpen ? (
              <div
                className="absolute end-0 top-full z-50 mt-1 grid min-w-40 gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg"
                role="menu"
              >
                {[
                  [t('catalogs.actions.rename'), onRename],
                  [t('catalogs.actions.duplicate'), onDuplicate],
                  [t('catalogs.actions.tags'), onTags],
                  [t('catalogs.actions.group'), onGroup],
                ].map(([label, action]) => (
                  <button
                    key={String(label)}
                    type="button"
                    className="rounded-md px-3 py-2 text-start text-sm hover:bg-[var(--default)]"
                    onClick={() => {
                      (action as () => void)();
                      setMenuOpen(false);
                    }}
                    role="menuitem"
                  >
                    {String(label)}
                  </button>
                ))}
                <button
                  type="button"
                  className="rounded-md px-3 py-2 text-start text-sm text-[var(--danger)] hover:bg-[var(--default)]"
                  onClick={() => {
                    onDelete();
                    setMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  <span className="flex items-center gap-2">
                    <Trash2 className="size-4" aria-hidden />
                    {t('catalogs.actions.delete')}
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </Table.Cell>
    </Table.Row>
  );
}
