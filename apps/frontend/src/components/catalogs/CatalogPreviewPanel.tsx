import { useTranslation } from "react-i18next";
import { Card, Chip, ScrollShadow } from "@metalayer/shared-ui";
import { X } from "lucide-react";
import type { CatalogListItem, CatalogMetaPreview } from "@/lib/api";
import { sourceLabel } from "@/lib/source-presentation";
import { CatalogTitleCard } from "@/components/catalogs/CatalogTitleCard";
import { LoadingState } from "@/components/metalayer/LoadingState";
import { SourceProviderIcon } from "@/components/sources/SourceProviderIcon";

export function CatalogPreviewPanel({
  catalog,
  displayName,
  metas,
  warnings,
  loading,
  onClose,
}: {
  catalog: CatalogListItem | null;
  displayName: string | null;
  metas: CatalogMetaPreview[];
  warnings: Array<{
    code: string;
    params?: Record<string, string | undefined>;
  }>;
  loading: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation("catalogs");

  if (!catalog || !displayName) {
    return (
      <Card className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <Card.Header>
          <Card.Title>{t("catalogs.preview.panelTitle")}</Card.Title>
        </Card.Header>
        <Card.Content>
          <p className="text-sm ml-text-muted">
            {t("catalogs.preview.selectHint")}
          </p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <Card.Header className="flex shrink-0 flex-row flex-wrap items-center justify-between gap-2">
        <Card.Title>{t("catalogs.preview.panelTitle")}</Card.Title>
        <button
          type="button"
          className="rounded-md p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--default)] hover:text-[var(--foreground)]"
          aria-label={t("catalogs.preview.close")}
          onClick={onClose}
        >
          <X className="size-4" aria-hidden />
        </button>
      </Card.Header>

      <Card.Content className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <ScrollShadow
          className="min-h-0 flex-1 overflow-y-auto"
          orientation="vertical"
          size={40}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <SourceProviderIcon
                providerId={catalog.provider}
                name={catalog.provider}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold text-[var(--foreground)]">
                    {displayName}
                  </h3>
                  <Chip
                    size="sm"
                    variant="soft"
                    color={catalog.enabled ? "success" : "default"}
                  >
                    {catalog.enabled
                      ? t("catalogs.actions.enable")
                      : t("catalogs.actions.disable")}
                  </Chip>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Chip size="sm" variant="soft" color="default">
                    {metas.length} {t("catalogs.preview.loaded")}
                  </Chip>
                  <Chip size="sm" variant="soft" color="default">
                    {t(`catalogs.type.${catalog.mediaType}`)}
                  </Chip>
                  {catalog.merge ? (
                    <Chip size="sm" variant="soft" color="default">
                      {t("catalogs.badge.merged")}
                    </Chip>
                  ) : null}
                  {catalog.rotation ? (
                    <Chip size="sm" variant="soft" color="default">
                      {t("catalogs.badge.rotated")}
                    </Chip>
                  ) : null}
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-4">
              <div className="flex gap-2 items-center">
                <dt className="text-xs ml-text-muted">
                  {t("catalogs.field.provider")}: 
                </dt>
                <dd className="inline-flex items-center gap-2 font-medium text-[var(--foreground)]">
                  <span>{sourceLabel(catalog.provider)}</span>
                </dd>
              </div>
              <div className="flex gap-2 items-center">
                <dt className="text-xs ml-text-muted">
                  {t("catalogs.field.type")}: 
                </dt>
                <dd className="font-medium text-[var(--foreground)]">
                  {t(`catalogs.type.${catalog.mediaType}`)}
                </dd>
              </div>
              <div className="flex gap-2 items-center">
                <dt className="text-xs ml-text-muted">
                  {t("catalogs.field.home")}: 
                </dt>
                <dd className="font-medium text-[var(--foreground)]">
                  {catalog.showInHome ? "True" : "False"}
                </dd>
              </div>
              <div className="flex gap-2 items-center">
                <dt className="text-xs ml-text-muted">
                  {t("catalogs.field.group")}: 
                </dt>
                <dd className="truncate font-medium text-[var(--foreground)]">
                  {catalog.group || t("catalogs.preview.none")}
                </dd>
              </div>
            </dl>

            {catalog.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {catalog.tags.map((tag) => (
                  <Chip key={tag} size="sm" variant="soft" color="default">
                    {tag}
                  </Chip>
                ))}
              </div>
            ) : null}
          </div>

          {warnings.length > 0 ? (
            <ul
              className="space-y-1 px-4 pb-2 text-sm text-[var(--warning)]"
              role="status"
            >
              {warnings.map((warning) => (
                <li
                  key={`${warning.code}-${warning.params?.instanceId ?? ""}-${warning.params?.sourceId ?? ""}-${warning.params?.mode ?? ""}`}
                >
                  {t(`catalogs.warning.${warning.code}`, {
                    ...warning.params,
                    defaultValue: warning.code,
                  })}
                </li>
              ))}
            </ul>
          ) : null}

          {loading ? (
            <div className="px-4 py-6">
              <LoadingState label={t("catalogs.preview.loading")} />
            </div>
          ) : metas.length === 0 ? (
            <p className="px-4 py-3 text-sm ml-text-muted">
              {t("catalogs.resultsEmpty")}
            </p>
          ) : (
            <>
              <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                {t("catalogs.preview.firstTitles", { count: metas.length })}
              </h4>
              <div className="grid grid-cols-4 gap-3">
                {metas.slice(0, 18).map((meta) => (
                  <CatalogTitleCard
                    key={`${meta.id}-${meta.sourceInstanceId ?? ""}`}
                    meta={meta}
                  />
                ))}
              </div>
            </>
          )}
        </ScrollShadow>
      </Card.Content>
    </Card>
  );
}
