import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X } from 'lucide-react';
import { Button, Card, Tabs } from '@metalayer/shared-ui';
import type {
  FieldResolutionPlan,
  LocalePreference,
  ResolutionStep,
} from '@metalayer/config';
import { cn } from '@/lib/utils';
import { sourceLabel } from '@/lib/source-presentation';
import { LocaleFlag, ProviderGlyph } from './field-icons';

export interface ResolutionChainBuilderProps {
  fieldLabel: string;
  fieldDescription?: string;
  value: FieldResolutionPlan;
  onChange: (value: FieldResolutionPlan) => void;
  providerOptions: string[];
  allowLocales?: boolean;
  disabled?: boolean;
  showEffectiveOrder?: boolean;
  footer?: ReactNode;
}

type EditorMode = 'simple' | 'explicit';

function localeKey(locale: LocalePreference, index: number): string {
  if (locale.type === 'locale') return `locale:${locale.value}`;
  return `${locale.type}:${index}`;
}

function localeLabel(
  locale: LocalePreference,
  t: (key: string, options?: Record<string, string>) => string,
): string {
  switch (locale.type) {
    case 'locale':
      return locale.value;
    case 'original-language':
      return t('resolution.locale.original');
    case 'no-language':
      return t('resolution.locale.noLanguage');
    case 'any-language':
      return t('resolution.locale.any');
    case 'provider-default':
      return t('resolution.locale.providerDefault');
    default:
      return t('resolution.locale.unknown');
  }
}

function SortableChipRow({
  id,
  label,
  leading,
  disabled,
  onRemove,
  removeLabel,
}: {
  id: string;
  label: string;
  leading?: ReactNode;
  disabled?: boolean;
  onRemove: () => void;
  removeLabel: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-2 py-1.5',
        isDragging && 'z-20 opacity-90 shadow-md',
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none p-0.5 text-[var(--muted-foreground)] active:cursor-grabbing"
        aria-label={label}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <span className="max-w-40 truncate text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        isIconOnly
        isDisabled={disabled}
        aria-label={removeLabel}
        onPress={onRemove}
      >
        <X className="size-3.5" aria-hidden />
      </Button>
    </li>
  );
}

function buildStepsFromSimple(plan: FieldResolutionPlan): ResolutionStep[] {
  const providers = plan.providers ?? [];
  const locales = plan.locales?.length
    ? plan.locales
    : [{ type: 'any-language' as const }];
  const steps: ResolutionStep[] = [];
  if (plan.strategy === 'provider-first') {
    for (const provider of providers) {
      for (const locale of locales) {
        steps.push({
          id: `${provider}-${localeKey(locale, steps.length)}`,
          provider,
          locale,
          enabled: true,
        });
      }
    }
  } else {
    for (const locale of locales) {
      for (const provider of providers) {
        steps.push({
          id: `${provider}-${localeKey(locale, steps.length)}`,
          provider,
          locale,
          enabled: true,
        });
      }
    }
  }
  return steps;
}

/** Field Resolution Chain editor for Metas → Fields (AGENTS.md §10.17). */
export function ResolutionChainBuilder({
  fieldLabel,
  fieldDescription,
  value,
  onChange,
  providerOptions,
  allowLocales = true,
  disabled = false,
  showEffectiveOrder = true,
  footer,
}: ResolutionChainBuilderProps) {
  const { t } = useTranslation('resolution');
  const [addMenu, setAddMenu] = useState<'provider' | 'locale' | null>(null);

  const mode: EditorMode =
    value.strategy === 'explicit' ? 'explicit' : 'simple';

  const providers = useMemo(() => value.providers ?? [], [value.providers]);
  const locales = useMemo(() => value.locales ?? [], [value.locales]);
  const steps = useMemo(() => value.steps ?? [], [value.steps]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const effectivePreview = useMemo<
    Array<{ provider: string; locale?: LocalePreference }>
  >(() => {
    const source =
      value.strategy === 'explicit'
        ? (value.steps ?? [])
        : buildStepsFromSimple(value);
    return source.map((step) => ({
      provider: step.provider,
      locale: step.locale,
    }));
  }, [value]);

  const availableProviders = providerOptions.filter(
    (provider) => !providers.includes(provider),
  );

  const localeChoices: LocalePreference[] = [
    { type: 'locale', value: 'pt-BR' },
    { type: 'locale', value: 'en-US' },
    { type: 'original-language' },
    { type: 'no-language' },
    { type: 'any-language' },
    { type: 'provider-default' },
  ];

  function setMode(next: EditorMode) {
    if (next === 'explicit') {
      const nextSteps =
        value.steps && value.steps.length > 0
          ? value.steps
          : buildStepsFromSimple({
              ...value,
              strategy:
                value.strategy === 'provider-first'
                  ? 'provider-first'
                  : 'locale-first',
            });
      onChange({
        ...value,
        strategy: 'explicit',
        steps: nextSteps,
      });
      return;
    }
    onChange({
      ...value,
      strategy:
        value.strategy === 'provider-first' ? 'provider-first' : 'locale-first',
    });
  }

  function onProviderDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = providers.indexOf(String(active.id));
    const newIndex = providers.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange({ ...value, providers: arrayMove(providers, oldIndex, newIndex) });
  }

  function onLocaleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = locales.map((locale, index) => localeKey(locale, index));
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange({ ...value, locales: arrayMove(locales, oldIndex, newIndex) });
  }

  function onStepDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = steps.map((step) => step.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange({ ...value, steps: arrayMove(steps, oldIndex, newIndex) });
  }

  const preferLocalized = value.strategy !== 'provider-first';
  const fallbackOriginal = locales.some(
    (locale) => locale.type === 'original-language',
  );

  const effectiveOrderPanel = showEffectiveOrder ? (
    <div className="space-y-2">
      <p className="text-sm font-medium text-[var(--foreground)]">
        {t('resolution.effectiveOrder')}
      </p>
      {effectivePreview.length === 0 ? (
        <p className="text-xs ml-text-muted">
          {t('resolution.effectiveOrderEmpty')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {effectivePreview.slice(0, 10).map((row, index) => (
                <tr
                  key={`${row.provider}-${index}`}
                  className="border-b border-[var(--border)] last:border-b-0"
                >
                  <td className="w-8 px-3 py-2 text-xs tabular-nums ml-text-muted">
                    {index + 1}
                  </td>
                  <td className="px-1 py-2">
                    <span className="flex items-center gap-2">
                      <ProviderGlyph provider={row.provider} />
                      <span className="font-medium text-[var(--foreground)]">
                        {sourceLabel(row.provider)}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2 ml-text-muted">
                      <LocaleFlag locale={row.locale} />
                      <span className="truncate">
                        {row.locale
                          ? localeLabel(row.locale, t)
                          : t('resolution.locale.any')}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {effectivePreview.length > 10 ? (
        <p className="text-xs ml-text-muted">
          {t('resolution.effectiveOrderMore', {
            count: effectivePreview.length - 10,
          })}
        </p>
      ) : null}
    </div>
  ) : null;

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <Card.Header className="shrink-0 space-y-1">
        <Card.Title>{fieldLabel}</Card.Title>
        {fieldDescription ? (
          <Card.Description>{fieldDescription}</Card.Description>
        ) : (
          <Card.Description>{t('resolution.builderIntro')}</Card.Description>
        )}
      </Card.Header>

      <Card.Content className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {t('resolution.mode.label')}
          </p>
          <Tabs
            selectedKey={mode}
            onSelectionChange={(key) => {
              const nextMode = String(key);
              if (nextMode === 'simple' || nextMode === 'explicit') {
                setMode(nextMode);
              }
            }}
            className="w-fit"
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label={t('resolution.mode.label')}>
                {(['simple', 'explicit'] as const).map((item) => (
                  <Tabs.Tab key={item} id={item} isDisabled={disabled}>
                    {t(`resolution.mode.${item}`)}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        </div>

        {mode === 'simple' ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {t('resolution.providers')}
                  </p>
                  <p className="text-xs ml-text-muted">
                    {t('resolution.providersHint')}
                  </p>
                </div>
                <div className="relative">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    isDisabled={disabled || availableProviders.length === 0}
                    onPress={() =>
                      setAddMenu((current) =>
                        current === 'provider' ? null : 'provider',
                      )
                    }
                  >
                    <Plus className="size-3.5" aria-hidden />
                    {t('resolution.addProviderShort')}
                  </Button>
                  {addMenu === 'provider' ? (
                    <div className="absolute end-0 top-full z-30 mt-1 grid min-w-40 gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
                      {availableProviders.map((provider) => (
                        <button
                          key={provider}
                          type="button"
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-start text-sm hover:bg-[var(--default)]"
                          onClick={() => {
                            onChange({
                              ...value,
                              providers: [...providers, provider],
                            });
                            setAddMenu(null);
                          }}
                        >
                          <ProviderGlyph provider={provider} />
                          {sourceLabel(provider)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onProviderDragEnd}
              >
                <SortableContext
                  items={providers}
                  strategy={horizontalListSortingStrategy}
                >
                  <ul className="flex flex-wrap items-center gap-2">
                    {providers.map((provider) => (
                      <SortableChipRow
                        key={provider}
                        id={provider}
                        label={sourceLabel(provider)}
                        leading={<ProviderGlyph provider={provider} />}
                        disabled={disabled}
                        removeLabel={t('resolution.removeNamed', {
                          item: sourceLabel(provider),
                        })}
                        onRemove={() =>
                          onChange({
                            ...value,
                            providers: providers.filter(
                              (item) => item !== provider,
                            ),
                          })
                        }
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            </div>

            {allowLocales ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {t('resolution.locales')}
                    </p>
                    <p className="text-xs ml-text-muted">
                      {t('resolution.localesHint')}
                    </p>
                  </div>
                  <div className="relative">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      isDisabled={disabled}
                      onPress={() =>
                        setAddMenu((current) =>
                          current === 'locale' ? null : 'locale',
                        )
                      }
                    >
                      <Plus className="size-3.5" aria-hidden />
                      {t('resolution.addLocaleShort')}
                    </Button>
                    {addMenu === 'locale' ? (
                      <div className="absolute end-0 top-full z-30 mt-1 grid min-w-44 gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
                        {localeChoices.map((locale, index) => {
                          const label = localeLabel(locale, t);
                          const key = localeKey(locale, index);
                          const exists = locales.some(
                            (item, itemIndex) =>
                              localeKey(item, itemIndex) === key ||
                              (item.type === locale.type &&
                                (locale.type !== 'locale' ||
                                  ('value' in item &&
                                    item.value === locale.value))),
                          );
                          return (
                            <button
                              key={key}
                              type="button"
                              disabled={exists}
                              className="flex items-center gap-2 rounded-md px-3 py-2 text-start text-sm hover:bg-[var(--default)] disabled:opacity-40"
                              onClick={() => {
                                onChange({
                                  ...value,
                                  locales: [...locales, locale],
                                });
                                setAddMenu(null);
                              }}
                            >
                              <LocaleFlag locale={locale} />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onLocaleDragEnd}
                >
                  <SortableContext
                    items={locales.map((locale, index) =>
                      localeKey(locale, index),
                    )}
                    strategy={horizontalListSortingStrategy}
                  >
                    <ul className="flex flex-wrap items-center gap-2">
                      {locales.map((locale, index) => {
                        const id = localeKey(locale, index);
                        const label = localeLabel(locale, t);
                        return (
                          <SortableChipRow
                            key={id}
                            id={id}
                            label={label}
                            leading={<LocaleFlag locale={locale} />}
                            disabled={disabled}
                            removeLabel={t('resolution.removeNamed', {
                              item: label,
                            })}
                            onRemove={() =>
                              onChange({
                                ...value,
                                locales: locales.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              })
                            }
                          />
                        );
                      })}
                    </ul>
                  </SortableContext>
                </DndContext>
              </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {t('resolution.options.label')}
              </p>
              {allowLocales ? (
                <>
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={preferLocalized}
                      disabled={disabled}
                      onChange={(event) =>
                        onChange({
                          ...value,
                          strategy: event.target.checked
                            ? 'locale-first'
                            : 'provider-first',
                        })
                      }
                    />
                    <span>
                      <span className="font-medium text-[var(--foreground)]">
                        {t('resolution.options.preferLocalized')}
                      </span>
                      <span className="mt-0.5 block text-xs ml-text-muted">
                        {t('resolution.options.preferLocalizedHint')}
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={fallbackOriginal}
                      disabled={disabled}
                      onChange={(event) => {
                        if (event.target.checked) {
                          if (fallbackOriginal) return;
                          onChange({
                            ...value,
                            locales: [
                              ...locales,
                              { type: 'original-language' },
                            ],
                          });
                          return;
                        }
                        onChange({
                          ...value,
                          locales: locales.filter(
                            (locale) => locale.type !== 'original-language',
                          ),
                        });
                      }}
                    />
                    <span>
                      <span className="font-medium text-[var(--foreground)]">
                        {t('resolution.options.fallbackOriginal')}
                      </span>
                      <span className="mt-0.5 block text-xs ml-text-muted">
                        {t('resolution.options.fallbackOriginalHint')}
                      </span>
                    </span>
                  </label>
                </>
              ) : null}
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={value.skipEmpty}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({ ...value, skipEmpty: event.target.checked })
                  }
                />
                <span>
                  <span className="font-medium text-[var(--foreground)]">
                    {t('resolution.options.requireNonEmpty')}
                  </span>
                  <span className="mt-0.5 block text-xs ml-text-muted">
                    {t('resolution.options.requireNonEmptyHint')}
                  </span>
                </span>
              </label>
            </div>
              {effectiveOrderPanel}
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {t('resolution.explicitSteps')}
            </p>
            <p className="text-xs ml-text-muted">{t('resolution.explicitHint')}</p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onStepDragEnd}
            >
              <SortableContext
                items={steps.map((step) => step.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2">
                  {steps.map((step) => {
                    const label = `${sourceLabel(step.provider)} · ${
                      step.locale
                        ? localeLabel(step.locale, t)
                        : t('resolution.locale.any')
                    }`;
                    return (
                      <SortableChipRow
                        key={step.id}
                        id={step.id}
                        label={label}
                        leading={<ProviderGlyph provider={step.provider} />}
                        disabled={disabled}
                        removeLabel={t('resolution.removeNamed', {
                          item: label,
                        })}
                        onRemove={() =>
                          onChange({
                            ...value,
                            steps: steps.filter((item) => item.id !== step.id),
                          })
                        }
                      />
                    );
                  })}
                </ul>
              </SortableContext>
            </DndContext>
            <div className="flex flex-wrap gap-2">
              {providerOptions.map((provider) => (
                <Button
                  key={provider}
                  type="button"
                  size="sm"
                  variant="outline"
                  isDisabled={disabled}
                  onPress={() =>
                    onChange({
                      ...value,
                      steps: [
                        ...steps,
                        {
                          id: `${provider}-${Date.now()}`,
                          provider,
                          locale: allowLocales
                            ? { type: 'locale', value: 'en-US' }
                            : { type: 'provider-default' },
                          enabled: true,
                        },
                      ],
                    })
                  }
                >
                  <Plus className="size-3.5" aria-hidden />
                  <ProviderGlyph provider={provider} />
                  {sourceLabel(provider)}
                </Button>
              ))}
            </div>
            {effectiveOrderPanel}
          </div>
        )}
      </Card.Content>

      {footer ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}
