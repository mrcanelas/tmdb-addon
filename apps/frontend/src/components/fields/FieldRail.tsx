import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clapperboard,
  Image,
  Languages,
  ListOrdered,
  Palette,
  Search,
  Star,
  Type,
  Users,
} from 'lucide-react';
import { Card, Chip, Input, ScrollShadow } from '@metalayer/shared-ui';
import {
  filterFieldRegistry,
  groupFieldEntries,
  type FieldRailEntry,
  type FieldRailId,
} from '@/lib/field-registry';
import { cn } from '@/lib/utils';

function FieldIcon({ entry }: { entry: FieldRailEntry }) {
  const className = 'size-3.5';
  switch (entry.icon) {
    case 'language':
      return <Languages className={className} aria-hidden />;
    case 'appearance':
      return <Palette className={className} aria-hidden />;
    case 'image':
      return <Image className={className} aria-hidden />;
    case 'fact':
      return <Clapperboard className={className} aria-hidden />;
    case 'people':
      return <Users className={className} aria-hidden />;
    case 'star':
      return <Star className={className} aria-hidden />;
    case 'list':
      return <ListOrdered className={className} aria-hidden />;
    default:
      return <Type className={className} aria-hidden />;
  }
}

export function FieldRail({
  selectedId,
  query,
  onQueryChange,
  onSelect,
  onNavigate,
}: {
  selectedId: FieldRailId;
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (id: FieldRailId) => void;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation('resolution');

  const visibleGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const entries = filterFieldRegistry('').filter((entry) => {
      if (!normalized) return true;
      const label = t(`resolution.field.${entry.id}`).toLowerCase();
      return (
        entry.id.toLowerCase().includes(normalized) ||
        label.includes(normalized)
      );
    });
    return groupFieldEntries(entries);
  }, [query, t]);

  return (
    <Card className="flex h-full min-h-0 w-full flex-col overflow-hidden gap-0 p-0">
      <Card.Header className="shrink-0 space-y-3 m-4">
        <label className="relative block">
          <span className="sr-only">{t('resolution.rail.searchLabel')}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t('resolution.rail.searchPlaceholder')}
            className="w-full ps-9"
          />
        </label>
      </Card.Header>

      <Card.Content className="min-h-0 flex-1 overflow-hidden p-0 ml-2">
<ScrollShadow
          className="h-full min-h-0 overflow-y-auto"
          orientation="vertical"
          size={32}
        >
          <nav aria-label={t('resolution.rail.aria')} className="space-y-5">
            {visibleGroups.map((block) => (
              <div key={block.group} className="space-y-1">
                <p className="px-3 pb-1 text-xs font-medium text-[var(--muted)] ml-text-muted">
                  {t(`resolution.group.${block.group}`)}
                </p>
                <ul className="space-y-0.5 px-1.5">
                  {block.fields.map((entry) => {
                    const selected = entry.id === selectedId;
                    const label = t(`resolution.field.${entry.id}`);
                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          disabled={!entry.editable}
                          aria-current={selected ? 'true' : undefined}
                          className={cn(
                            // Reduzido o padding vertical (py-1.5) e arredondamento mais sutil (rounded-lg)
                            'flex w-full items-center gap-2.5 rounded-lg px-2 py-0.5 text-start text-sm transition-colors',
                            selected
                              ? 'bg-[var(--accent)] text-[var(--foreground)]'
                              : 'text-[var(--muted)] hover:bg-[var(--default)] hover:text-[var(--foreground)]',
                            !entry.editable && 'cursor-not-allowed opacity-55',
                          )}
                          onClick={() => {
                            if (entry.editable) {
                              onSelect(entry.id);
                              onNavigate?.();
                            }
                          }}
                        >
                          {/* Removida a borda, o size-7 e o rounded. Agora o ícone fica livre. */}
                          <span
                            className={cn(
                              'flex shrink-0 items-center justify-center',
                              selected ? 'text-[var(--foreground)]' : 'opacity-70'
                            )}
                          >
                            <FieldIcon entry={entry} />
                          </span>
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {label}
                          </span>

                          {/* Se não for editável, mostra o Chip. Se for selecionado, mostra a bolinha azul */}
                          {!entry.editable ? (
                            <Chip size="sm" variant="soft" color="default">
                              {t('resolution.rail.comingSoon')}
                            </Chip>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </ScrollShadow>
      </Card.Content>
    </Card>
  );
}
