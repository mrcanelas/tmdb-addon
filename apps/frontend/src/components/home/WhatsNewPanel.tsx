import { useTranslation } from "react-i18next";
import Markdown from "react-markdown";
import { ArrowRight } from "lucide-react";
import { Card, Chip, ScrollShadow } from "@metalayer/shared-ui";
import { useGithubReleasesQuery } from "@/api/hooks/use-github-releases";
import { LoadingState } from "@/components/metalayer/LoadingState";
import {
  formatReleaseDate,
  listStableReleases,
  releaseBodyText,
  releaseDisplayVersion,
  WHATS_NEW_RELEASES_HREF,
} from "@/lib/whats-new";

export function WhatsNewPanel() {
  const { t, i18n } = useTranslation();
  const releasesQuery = useGithubReleasesQuery();

  // TEMP: AIOStreams preview — revert to pickMetaLayerRelease before ship.
  const latestRelease = releasesQuery.data
    ? (listStableReleases(releasesQuery.data, 1)[0] ?? null)
    : null;

  const version = latestRelease ? releaseDisplayVersion(latestRelease) : null;
  const body = latestRelease ? releaseBodyText(latestRelease) : "";
  const published = latestRelease
    ? formatReleaseDate(latestRelease.published_at, i18n.language)
    : null;

  const showEmpty =
    !releasesQuery.isLoading && !releasesQuery.isError && !latestRelease;

  return (
    <Card className="flex h-full min-h-0 w-full flex-col">
      <Card.Header className="flex shrink-0 flex-row flex-wrap items-center justify-between gap-2">
        <Card.Title>{t("overview.whatsNew.title")}</Card.Title>
        {latestRelease && !releasesQuery.isLoading ? (
          <a
            href={latestRelease.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm font-medium text-[var(--ml-text)] underline-offset-4 hover:underline"
          >
            <Chip size="sm" variant="soft" color="accent">
              {latestRelease.tag_name}
            </Chip>
          </a>
        ) : null}
      </Card.Header>
      <Card.Content className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        {releasesQuery.isLoading ? (
          <LoadingState label={t("overview.whatsNew.loading")} />
        ) : null}

        {releasesQuery.isError ? (
          <p className="text-sm ml-text-muted" role="status">
            {t("overview.whatsNew.loadError")}
          </p>
        ) : null}

        {showEmpty ? (
          <p className="text-sm ml-text-muted" role="status">
            {t("overview.whatsNew.empty")}
          </p>
        ) : null}

        {latestRelease && !releasesQuery.isLoading ? (
          <>
            {body ? (
              <ScrollShadow
                className="min-h-0 flex-1"
                orientation="vertical"
                size={40}
              >
                <div className="whats-new-markdown pe-1 text-sm leading-relaxed ml-text-muted">
                  <Markdown
                    components={{
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[var(--ml-text)] underline-offset-2 hover:underline"
                        >
                          {children}
                        </a>
                      ),
                      ul: ({ children }) => (
                        <ul className="my-2 list-disc space-y-1 ps-5">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="my-2 list-decimal space-y-1 ps-5">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed">{children}</li>
                      ),
                      h1: ({ children }) => (
                        <h3 className="mt-3 mb-1 text-sm font-semibold text-[var(--ml-text)]">
                          {children}
                        </h3>
                      ),
                      h2: ({ children }) => (
                        <h3 className="mt-3 mb-1 text-sm font-semibold text-[var(--ml-text)]">
                          {children}
                        </h3>
                      ),
                      h3: ({ children }) => (
                        <h4 className="mt-2 mb-1 text-sm font-medium text-[var(--ml-text)]">
                          {children}
                        </h4>
                      ),
                      p: ({ children }) => <p className="my-2">{children}</p>,
                      code: ({ children }) => (
                        <code className="rounded bg-[var(--ml-elevated)] px-1 py-0.5 font-mono text-[0.8em] text-[var(--ml-text)]">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="my-2 overflow-x-auto rounded-md bg-[var(--ml-elevated)] p-2 font-mono text-xs text-[var(--ml-text)]">
                          {children}
                        </pre>
                      ),
                      hr: () => (
                        <hr className="my-3 border-[var(--ml-border)]" />
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-[var(--ml-text)]">
                          {children}
                        </strong>
                      ),
                    }}
                  >
                    {body}
                  </Markdown>
                </div>
              </ScrollShadow>
            ) : (
              <p className="text-sm ml-text-muted">
                {t("overview.whatsNew.noBody")}
              </p>
            )}
          </>
        ) : null}
      </Card.Content>
      <Card.Footer className="shrink-0">
        <a
          href={WHATS_NEW_RELEASES_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ml-text)] underline-offset-4 hover:underline"
        >
          {t("overview.whatsNew.fullChangelog")}
          <ArrowRight className="size-3.5" aria-hidden />
        </a>
      </Card.Footer>
    </Card>
  );
}
