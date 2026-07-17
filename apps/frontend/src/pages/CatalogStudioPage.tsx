import { resolveCatalogDisplayName } from "@metalayer/catalogs";
import type { CatalogDefinition } from "@metalayer/config";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Download,
  Eye,
  EyeOff,
  Home,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import {
  bootstrapCatalogDraft,
  clearCatalogSession,
  createStudioCatalog,
  exportStudioCatalogs,
  fetchCatalogs,
  importStudioCatalogs,
  mutateCatalog,
  previewCatalogResults,
  readCatalogSession,
  type CatalogListItem,
  type CatalogMetaPreview,
  type ManifestCatalogEntry,
  type StudioCatalogAction,
} from "@/lib/api";
import { syncStudioSessionQuery } from "@/api/hooks/use-studio-session";
import {
  Button,
  Card,
  Chip,
  Input,
  Table,
  Tabs,
  toast,
} from "@metalayer/shared-ui";
import { usePageHeader } from "@/contexts/page-title";
import { LoadingState } from "@/components/metalayer/LoadingState";
import { ErrorState } from "@/components/metalayer/ErrorState";
import { StudioPromptDialog } from "@/components/metalayer/StudioPromptDialog";
import { CatalogBulkBar } from "@/components/catalogs/CatalogBulkBar";
import { CatalogPreviewPanel } from "@/components/catalogs/CatalogPreviewPanel";
import { CatalogStudioRow } from "@/components/catalogs/CatalogStudioRow";
import {
  deselectByProvider,
  invertSelection,
  selectAllVisible,
  selectByProvider,
  toggleSelection,
  uniqueProviders,
} from "@/components/catalogs/catalog-selection";
import { cn } from "@/lib/utils";

function displayName(catalog: CatalogListItem, locale: string): string {
  return resolveCatalogDisplayName(catalog as CatalogDefinition, locale);
}

type CatalogEditDialog =
  | { kind: "rename"; catalogId: string; value: string }
  | { kind: "tags"; catalogId: string; value: string }
  | { kind: "group"; catalogId: string; value: string };

type CatalogMediaFilter = "all" | CatalogListItem["mediaType"];

export function CatalogStudioPage() {
  const { t, i18n } = useTranslation(["catalogs", "common"]);
  usePageHeader(t("catalogs.title"), t("catalogs.intro"));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [catalogs, setCatalogs] = useState<CatalogListItem[]>([]);
  const [manifestOrder, setManifestOrder] = useState<ManifestCatalogEntry[]>(
    [],
  );
  const [configId, setConfigId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [previewMetas, setPreviewMetas] = useState<CatalogMetaPreview[]>([]);
  const [previewWarnings, setPreviewWarnings] = useState<
    Array<{ code: string; params?: Record<string, string | undefined> }>
  >([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [hideDisabled, setHideDisabled] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<CatalogMediaFilter>("all");
  const [query, setQuery] = useState("");
  const [editDialog, setEditDialog] = useState<CatalogEditDialog | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const applyPayload = useCallback(
    (payload: {
      configId: string;
      catalogs: CatalogListItem[];
      manifestOrder: ManifestCatalogEntry[];
    }) => {
      setConfigId(payload.configId);
      setCatalogs(payload.catalogs);
      setManifestOrder(payload.manifestOrder);
      setStatus("ready");
      syncStudioSessionQuery(queryClient);
    },
    [queryClient],
  );

  const load = useCallback(
    async (reset = false) => {
      setStatus("loading");
      try {
        if (reset) {
          clearCatalogSession();
          syncStudioSessionQuery(queryClient, null);
        }
        const session = readCatalogSession();
        if (!session) {
          const draft = await bootstrapCatalogDraft();
          applyPayload(draft);
          return;
        }
        const listed = await fetchCatalogs(
          session.configId,
          session.editCredential,
          i18n.language,
        );
        applyPayload({
          configId: listed.configId,
          catalogs: listed.catalogs,
          manifestOrder: listed.manifestOrder,
        });
      } catch {
        try {
          clearCatalogSession();
          syncStudioSessionQuery(queryClient, null);
          const draft = await bootstrapCatalogDraft();
          applyPayload(draft);
        } catch {
          setStatus("error");
        }
      }
    },
    [applyPayload, i18n.language, queryClient],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const visibleCatalogs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(i18n.language);
    return catalogs.filter((catalog) => {
      if (hideDisabled && !catalog.enabled) return false;
      if (mediaFilter !== "all" && catalog.mediaType !== mediaFilter)
        return false;
      if (!normalizedQuery) return true;
      const name = displayName(catalog, i18n.language).toLocaleLowerCase(
        i18n.language,
      );
      return (
        name.includes(normalizedQuery) ||
        catalog.provider
          .toLocaleLowerCase(i18n.language)
          .includes(normalizedQuery) ||
        catalog.tags.some((tag) =>
          tag.toLocaleLowerCase(i18n.language).includes(normalizedQuery),
        )
      );
    });
  }, [catalogs, hideDisabled, i18n.language, mediaFilter, query]);

  const activeCatalog = useMemo(
    () =>
      catalogs.find((catalog) => catalog.instanceId === activePreviewId) ??
      null,
    [catalogs, activePreviewId],
  );

  const activeDisplayName = activeCatalog
    ? displayName(activeCatalog, i18n.language)
    : null;

  const providers = useMemo(
    () => uniqueProviders(visibleCatalogs),
    [visibleCatalogs],
  );

  async function runAction(
    instanceId: string,
    action: StudioCatalogAction,
    extra?: {
      customName?: string;
      toIndex?: number;
      tags?: string[];
      group?: string | null;
      copySuffix?: string;
      locale?: string;
    },
  ) {
    const session = readCatalogSession();
    if (!session) return;
    setBusyId(instanceId);
    try {
      const result = await mutateCatalog(
        session.configId,
        session.editCredential,
        instanceId,
        {
          action,
          ...extra,
        },
      );
      setCatalogs(result.catalogs);
      setManifestOrder(result.manifestOrder);
      toast.success(t("catalogs.actionOk"));
    } catch {
      toast.danger(t("catalogs.actionError"));
    } finally {
      setBusyId(null);
    }
  }

  async function onPreview(catalog: CatalogListItem) {
    const session = readCatalogSession();
    if (!session) return;
    setActivePreviewId(catalog.instanceId);
    setPreviewLoading(true);
    setPreviewWarnings([]);
    try {
      const result = await previewCatalogResults(
        session.configId,
        session.editCredential,
        catalog.instanceId,
        { locale: i18n.language },
      );
      setPreviewMetas(result.metas);
      setPreviewWarnings(result.warnings ?? []);
    } catch {
      setPreviewMetas([]);
      setPreviewWarnings([{ code: "PREVIEW_REQUEST_FAILED" }]);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function onExport() {
    const session = readCatalogSession();
    if (!session) return;
    try {
      const exported = await exportStudioCatalogs(
        session.configId,
        session.editCredential,
      );
      const blob = new Blob([JSON.stringify(exported.catalogs, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `metalayer-catalogs-${session.configId}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(t("catalogs.actionOk"));
    } catch {
      toast.danger(t("catalogs.actionError"));
    }
  }

  async function onImportFile(file: File) {
    const session = readCatalogSession();
    if (!session) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const result = await importStudioCatalogs(
        session.configId,
        session.editCredential,
        parsed,
        "append",
      );
      applyPayload(result);
      toast.success(t("catalogs.actionOk"));
    } catch {
      toast.danger(t("catalogs.importError"));
    }
  }

  async function onCreateMerged() {
    const session = readCatalogSession();
    if (!session || catalogs.length < 2) return;
    const leafIds = catalogs
      .filter((catalog) => !catalog.merge && !catalog.rotation)
      .slice(0, 2)
      .map((catalog) => catalog.instanceId);
    if (leafIds.length < 2) return;
    try {
      const result = await createStudioCatalog(
        session.configId,
        session.editCredential,
        {
          action: "createMerged",
          name: t("catalogs.mergedDefaultName"),
          mediaType: "movie",
          mergeMode: "dedupe-union",
          sourceInstanceIds: leafIds,
        },
      );
      applyPayload(result);
      toast.success(t("catalogs.actionOk"));
    } catch {
      toast.danger(t("catalogs.actionError"));
    }
  }

  async function onCreateRotated() {
    const session = readCatalogSession();
    if (!session || catalogs.length < 2) return;
    const leafIds = catalogs
      .filter((catalog) => !catalog.merge && !catalog.rotation)
      .slice(0, 2)
      .map((catalog) => catalog.instanceId);
    if (leafIds.length < 2) return;
    try {
      const result = await createStudioCatalog(
        session.configId,
        session.editCredential,
        {
          action: "createRotated",
          name: t("catalogs.rotatedDefaultName"),
          mediaType: "movie",
          rotationMode: "daily",
          sourceInstanceIds: leafIds,
        },
      );
      applyPayload(result);
      toast.success(t("catalogs.actionOk"));
    } catch {
      toast.danger(t("catalogs.actionError"));
    }
  }

  function openEditDialog(
    kind: CatalogEditDialog["kind"],
    catalog: CatalogListItem,
  ) {
    if (kind === "rename") {
      setEditDialog({
        kind,
        catalogId: catalog.instanceId,
        value: displayName(catalog, i18n.language),
      });
      return;
    }
    if (kind === "tags") {
      setEditDialog({
        kind,
        catalogId: catalog.instanceId,
        value: catalog.tags.join(", "),
      });
      return;
    }
    setEditDialog({
      kind: "group",
      catalogId: catalog.instanceId,
      value: catalog.group ?? "",
    });
  }

  async function submitEditDialog() {
    if (!editDialog) return;
    const { kind, catalogId, value } = editDialog;
    if (kind === "rename") {
      const trimmed = value.trim();
      if (!trimmed) return;
      await runAction(catalogId, "rename", { customName: trimmed });
    } else if (kind === "tags") {
      await runAction(catalogId, "setTags", {
        tags: value
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
    } else {
      await runAction(catalogId, "setGroup", {
        group: value.trim() || null,
      });
    }
    setEditDialog(null);
  }

  async function persistOrder(nextCatalogs: CatalogListItem[]) {
    const session = readCatalogSession();
    if (!session) return;
    setBulkBusy(true);
    try {
      const result = await importStudioCatalogs(
        session.configId,
        session.editCredential,
        nextCatalogs,
        "replace",
      );
      applyPayload(result);
      toast.success(t("catalogs.actionOk"));
    } catch {
      toast.danger(t("catalogs.actionError"));
      await load();
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const oldIndex = catalogs.findIndex((c) => c.instanceId === activeId);
    const newIndex = catalogs.findIndex((c) => c.instanceId === overId);
    if (oldIndex < 0 || newIndex < 0) return;

    const selectedBlock =
      selectedIds.has(activeId) && selectedIds.size > 1
        ? catalogs.filter((c) => selectedIds.has(c.instanceId))
        : null;

    if (selectedBlock && selectedBlock.length > 1) {
      const remaining = catalogs.filter((c) => !selectedIds.has(c.instanceId));
      const insertAt = remaining.findIndex((c) => c.instanceId === overId);
      const next =
        insertAt < 0
          ? [...remaining, ...selectedBlock]
          : [
              ...remaining.slice(0, insertAt),
              ...selectedBlock,
              ...remaining.slice(insertAt),
            ];
      const reindexed = next.map((catalog, index) => ({
        ...catalog,
        position: index,
      }));
      setCatalogs(reindexed);
      await persistOrder(reindexed);
      return;
    }

    const next = arrayMove(catalogs, oldIndex, newIndex).map(
      (catalog, index) => ({
        ...catalog,
        position: index,
      }),
    );
    setCatalogs(next);
    await runAction(activeId, "move", { toIndex: newIndex });
  }

  async function runBulk(
    action: StudioCatalogAction,
    extra?: { toIndex?: number },
  ) {
    const session = readCatalogSession();
    if (!session || selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      let last = {
        catalogs,
        manifestOrder,
        configId: session.configId,
      };
      const ids = [...selectedIds];
      for (const instanceId of ids) {
        last = await mutateCatalog(
          session.configId,
          session.editCredential,
          instanceId,
          { action, ...extra },
        );
      }
      setCatalogs(last.catalogs);
      setManifestOrder(last.manifestOrder);
      if (action === "delete") {
        setSelectedIds(new Set());
        if (activePreviewId && ids.includes(activePreviewId)) {
          setActivePreviewId(null);
          setPreviewMetas([]);
        }
      }
      toast.success(t("catalogs.actionOk"));
    } catch {
      toast.danger(t("catalogs.actionError"));
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkMoveToEdge(edge: "top" | "bottom") {
    const session = readCatalogSession();
    if (!session || selectedIds.size === 0) return;
    const selected = catalogs.filter((c) => selectedIds.has(c.instanceId));
    const remaining = catalogs.filter((c) => !selectedIds.has(c.instanceId));
    const next =
      edge === "top"
        ? [...selected, ...remaining]
        : [...remaining, ...selected];
    const reindexed = next.map((catalog, index) => ({
      ...catalog,
      position: index,
    }));
    setCatalogs(reindexed);
    await persistOrder(reindexed);
  }

  const dialogTitle =
    editDialog?.kind === "rename"
      ? t("catalogs.dialog.renameTitle")
      : editDialog?.kind === "tags"
        ? t("catalogs.dialog.tagsTitle")
        : editDialog?.kind === "group"
          ? t("catalogs.dialog.groupTitle")
          : "";

  const dialogLabel =
    editDialog?.kind === "rename"
      ? t("catalogs.renamePrompt")
      : editDialog?.kind === "tags"
        ? t("catalogs.tagsPrompt")
        : editDialog?.kind === "group"
          ? t("catalogs.groupPrompt")
          : "";

  const allVisibleSelected =
    visibleCatalogs.length > 0 &&
    visibleCatalogs.every((c) => selectedIds.has(c.instanceId));

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch">
        <div className="min-w-0 flex-1 space-y-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="flex min-w-0 items-center gap-2">
              <Tabs
                selectedKey={mediaFilter}
                onSelectionChange={(key) => {
                  const next = String(key);
                  if (
                    next === "all" ||
                    next === "movie" ||
                    next === "series" ||
                    next === "anime"
                  ) {
                    setMediaFilter(next);
                  }
                }}
                className="min-w-0 flex-1 lg:w-fit lg:flex-none"
              >
                <Tabs.ListContainer>
                  <Tabs.List aria-label={t("catalogs.filter.aria")}>
                    {(["all", "movie", "series", "anime"] as const).map(
                      (filter) => (
                        <Tabs.Tab
                          key={filter}
                          id={filter}
                          className="px-2 sm:px-3"
                        >
                          {t(`catalogs.filter.${filter}`)}
                          <Tabs.Indicator />
                        </Tabs.Tab>
                      ),
                    )}
                  </Tabs.List>
                </Tabs.ListContainer>
              </Tabs>
              <div
                className="flex shrink-0 items-center gap-1"
                aria-label={t("catalogs.table.actions")}
              >
                <Button
                  type="button"
                  variant="tertiary"
                  isIconOnly
                  aria-label={t("catalogs.actions.export")}
                  onPress={() => void onExport()}
                >
                  <Download className="size-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="tertiary"
                  isIconOnly
                  aria-label={t("catalogs.actions.import")}
                  onPress={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4" aria-hidden />
                </Button>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-2 lg:flex-1">
              <label className="relative block min-w-0 flex-1">
                <span className="sr-only">{t("catalogs.search.label")}</span>
                <Search
                  className="pointer-events-none absolute start-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--muted)]"
                  aria-hidden
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("catalogs.search.placeholder")}
                  className="w-full ps-9"
                />
              </label>

              <Button
                type="button"
                variant="primary"
                className="shrink-0"
                onPress={() => navigate("/sources")}
              >
                <Plus className="size-4" aria-hidden />
                {t("catalogs.actions.addCatalog")}
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label={t("catalogs.actions.importFileAria")}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onImportFile(file);
              event.target.value = "";
            }}
          />

          {status === "loading" ? (
            <LoadingState label={t("catalogs.bootstrapping")} />
          ) : null}

          {status === "error" ? (
            <ErrorState
              message={t("catalogs.loadError")}
              retryLabel={t("state.retry", { ns: "common" })}
              onRetry={() => {
                void load();
              }}
            />
          ) : null}

          {status === "ready" && catalogs.length === 0 ? (
            <p className="ml-text-muted">{t("catalogs.empty")}</p>
          ) : null}

          {status === "ready" && catalogs.length > 0 ? (
            <div
              className={cn(
                "relative",
                (bulkBusy || busyId) && "pointer-events-none opacity-70",
              )}
            >
              {visibleCatalogs.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm ml-text-muted">
                  {t("catalogs.search.empty")}
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => {
                    void handleDragEnd(event);
                  }}
                >
                  <SortableContext
                    items={visibleCatalogs.map((catalog) => catalog.instanceId)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Table className="w-full">
                      <Table.ScrollContainer className="overflow-x-hidden sm:overflow-x-auto">
                        <Table.Content
                          aria-label={t("catalogs.table.aria")}
                          className="w-full table-fixed sm:min-w-[760px] sm:table-auto"
                        >
                          <Table.Header>
                            <Table.Column className="w-16 sm:w-20">
                              {t("catalogs.table.order")}
                            </Table.Column>
                            <Table.Column isRowHeader>
                              {t("catalogs.table.catalog")}
                            </Table.Column>
                            <Table.Column className="hidden sm:table-cell">
                              {t("catalogs.field.provider")}
                            </Table.Column>
                            <Table.Column className="hidden sm:table-cell">
                              {t("catalogs.field.type")}
                            </Table.Column>
                            <Table.Column className="w-32 text-end sm:w-64">
                              {t("catalogs.table.actions")}
                            </Table.Column>
                          </Table.Header>
                          <Table.Body>
                            {visibleCatalogs.map((catalog) => {
                              const fullIndex = catalogs.findIndex(
                                (candidate) =>
                                  candidate.instanceId === catalog.instanceId,
                              );
                              const name = displayName(catalog, i18n.language);
                              return (
                                <CatalogStudioRow
                                  key={catalog.instanceId}
                                  catalog={catalog}
                                  displayName={name}
                                  index={fullIndex}
                                  total={catalogs.length}
                                  selected={selectedIds.has(catalog.instanceId)}
                                  active={
                                    activePreviewId === catalog.instanceId
                                  }
                                  busy={
                                    busyId === catalog.instanceId || bulkBusy
                                  }
                                  onToggleSelect={() =>
                                    setSelectedIds((previous) =>
                                      toggleSelection(
                                        previous,
                                        catalog.instanceId,
                                      ),
                                    )
                                  }
                                  onActivate={() => void onPreview(catalog)}
                                  onToggleEnabled={() =>
                                    void runAction(
                                      catalog.instanceId,
                                      catalog.enabled ? "disable" : "enable",
                                    )
                                  }
                                  onToggleHome={() =>
                                    void runAction(
                                      catalog.instanceId,
                                      catalog.showInHome
                                        ? "hideInHome"
                                        : "showInHome",
                                    )
                                  }
                                  onMoveToTop={() =>
                                    void runAction(catalog.instanceId, "move", {
                                      toIndex: 0,
                                    })
                                  }
                                  onMoveToBottom={() =>
                                    void runAction(catalog.instanceId, "move", {
                                      toIndex: catalogs.length - 1,
                                    })
                                  }
                                  onRename={() =>
                                    openEditDialog("rename", catalog)
                                  }
                                  onDelete={() =>
                                    void runAction(catalog.instanceId, "delete")
                                  }
                                  onDuplicate={() =>
                                    void runAction(
                                      catalog.instanceId,
                                      "duplicate",
                                      {
                                        copySuffix: t("catalogs.copySuffix"),
                                        locale: i18n.language,
                                      },
                                    )
                                  }
                                  onTags={() => openEditDialog("tags", catalog)}
                                  onGroup={() =>
                                    openEditDialog("group", catalog)
                                  }
                                />
                              );
                            })}
                          </Table.Body>
                        </Table.Content>
                      </Table.ScrollContainer>
                    </Table>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          ) : null}
        </div>

        {status === "ready" && catalogs.length > 0 ? (
          /*
            Same rail pattern as Overview What’s New / Sources Connected:
            absolute fill on xl so poster grid never expands page height.
          */
          <aside className="relative z-10 w-full shrink-0 xl:h-[calc(100dvh-8.25rem)] xl:w-[340px]">
            <div className="xl:absolute xl:inset-0 xl:flex xl:min-h-0">
              <CatalogPreviewPanel
                catalog={activeCatalog}
                displayName={activeDisplayName}
                metas={previewMetas}
                warnings={previewWarnings}
                loading={previewLoading}
                onClose={() => {
                  setActivePreviewId(null);
                  setPreviewMetas([]);
                  setPreviewWarnings([]);
                }}
              />
            </div>
          </aside>
        ) : null}
      </div>

      <StudioPromptDialog
        open={editDialog !== null}
        title={dialogTitle}
        label={dialogLabel}
        value={editDialog?.value ?? ""}
        onChange={(value) => {
          if (!editDialog) return;
          setEditDialog({ ...editDialog, value });
        }}
        onConfirm={() => {
          void submitEditDialog();
        }}
        onCancel={() => setEditDialog(null)}
        confirmLabel={t("catalogs.dialog.confirm")}
        cancelLabel={t("catalogs.dialog.cancel")}
      />
    </section>
  );
}
