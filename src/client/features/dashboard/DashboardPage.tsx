import { Link } from "@tanstack/react-router";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/client/components/ui/tabs";
import { DashboardKeywords } from "./DashboardKeywords";
import { DashboardBacklinks } from "./DashboardBacklinks";
import { DashboardNewQueries } from "./DashboardNewQueries";
import { DashboardLinkActivity } from "./DashboardLinkActivity";
import { dashboardSiteTabSchema } from "@/types/schemas/dashboard";
import type { z } from "zod";
import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { sort } from "remeda";
import { DashboardOnboarding } from "./DashboardOnboarding";
import {
  AuditHealthCard,
  GscCard,
} from "@/client/features/dashboard/DashboardCards";
import { Ga4Card } from "@/client/features/dashboard/Ga4Card";
import { WorkspaceMergeBanner } from "@/client/features/dashboard/WorkspaceMergeBanner";
import { QueryError } from "@/client/components/QueryState";
import {
  getDashboardActivation,
  getDashboardOverview,
} from "@/serverFunctions/dashboard";
import { Skeleton } from "@/client/components/ui/skeleton";

export function DashboardPage({
  projectId,
  tab = "overview",
  onTabChange,
}: {
  projectId: string;
  tab?: z.infer<typeof dashboardSiteTabSchema>;
  onTabChange: (tab: z.infer<typeof dashboardSiteTabSchema>) => void;
}) {
  const activationQuery = useQuery({
    queryKey: ["dashboardActivation", projectId],
    queryFn: () => getDashboardActivation({ data: { projectId } }),
  });
  const overviewQuery = useQuery({
    queryKey: ["dashboardOverview", projectId],
    queryFn: () => getDashboardOverview({ data: { projectId } }),
    refetchInterval: (query) =>
      query.state.data?.audit?.status === "running" ? 3000 : false,
  });

  const activation = activationQuery.data;
  const overview = overviewQuery.data;

  if (activationQuery.isError && !activation) {
    return (
      <div className="px-4 py-4 md:px-6 md:py-6">
        <QueryError
          error={activationQuery.error}
          fallback="Failed to load dashboard"
          onRetry={() => void activationQuery.refetch()}
          isRetrying={activationQuery.isFetching}
        />
      </div>
    );
  }

  // Wait for the overview too: rendering cards from `overview === undefined`
  // flashes their empty states (and reshuffles the data-first sort) once the
  // real data lands. An overview error falls through so the page still loads,
  // with the error in place of the audit card.
  if (!activation || overviewQuery.isPending) {
    return (
      <div className="px-4 py-4 md:px-6 md:py-6" aria-busy>
        <div className="mx-auto flex max-w-7xl flex-col gap-5">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-36" />
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        </div>
      </div>
    );
  }

  const showBacklinks = activation.domain !== null;
  const gscConnected = activation.gsc.connected;
  const ga4Connected = activation.ga4.connected;

  // Search Console always renders: connected shows the report, otherwise the
  // connect pitch. It sits ahead of the optional GA4 pitch.
  const cards = [
    {
      key: "newQueries",
      hasData: gscConnected,
      node: (
        <DashboardNewQueries
          projectId={projectId}
          connected={gscConnected}
          siteUrl={activation.gsc.siteUrl}
          compact
        />
      ),
    },
    {
      key: "gsc",
      hasData: gscConnected,
      node: (
        <GscCard
          projectId={projectId}
          connected={gscConnected}
          siteUrl={activation.gsc.siteUrl}
        />
      ),
    },
    ...(ga4Connected || !activation.ga4.cardDismissedAt
      ? [
          {
            key: "ga4",
            hasData: ga4Connected,
            node: <Ga4Card projectId={projectId} connected={ga4Connected} />,
          },
        ]
      : []),
    ...(overview
      ? [
          {
            key: "audit",
            hasData: overview.audit != null,
            node: (
              <AuditHealthCard
                projectId={projectId}
                audit={overview.audit}
                domain={activation.domain}
              />
            ),
          },
        ]
      : []),
    ...(showBacklinks
      ? [
          {
            key: "backlinks",
            hasData: true,
            node: (
              <DashboardLinkActivity
                projectId={projectId}
                domain={activation.domain!}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Your website
            </p>
            <h1 className="text-2xl font-semibold">
              {activation.domain || "Dashboard"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Search visibility, links and site health in one place.
            </p>
          </div>
          <Link
            to="/p/$projectId/settings"
            params={{ projectId }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Project settings →
          </Link>
        </div>

        <WorkspaceMergeBanner />

        {activationQuery.isError ? (
          <QueryError
            error={activationQuery.error}
            fallback="Failed to refresh dashboard"
            onRetry={() => void activationQuery.refetch()}
            isRetrying={activationQuery.isFetching}
          />
        ) : null}

        {overviewQuery.isError ? (
          <QueryError
            error={overviewQuery.error}
            fallback="Failed to load site health"
            onRetry={() => void overviewQuery.refetch()}
            isRetrying={overviewQuery.isFetching}
          />
        ) : null}

        <Tabs
          value={tab}
          onValueChange={(value) => {
            const parsed = dashboardSiteTabSchema.safeParse(value);
            if (parsed.success) onTabChange(parsed.data);
          }}
        >
          <div className="overflow-x-auto border-b pb-2">
            <TabsList
              variant="line"
              className="h-11 gap-4"
              aria-label="Your website dashboard"
            >
              {(
                [
                  ["overview", "Overview"],
                  ["keywords", "Keywords"],
                  ["backlinks", "Backlinks"],
                ] as const
              ).map(([value, label]) => (
                <TabsTrigger key={value} value={value} className="px-2">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {/* Base UI unmounts inactive panels, so paid detail queries load only on opening their tab. */}
          <TabsContent
            value="overview"
            className="space-y-5 pt-4"
            keepMounted={false}
          >
            <>
              <DashboardOnboarding
                key={projectId}
                projectId={projectId}
                activation={activation}
              />

              <div className="grid gap-5 lg:grid-cols-2">
                {sort(
                  cards,
                  (a, b) => Number(b.hasData) - Number(a.hasData),
                ).map((card) => (
                  <Fragment key={card.key}>{card.node}</Fragment>
                ))}
              </div>
            </>
          </TabsContent>

          <TabsContent value="keywords" className="pt-4" keepMounted={false}>
            <DashboardKeywords
              key={`${projectId}:${activation.domain}`}
              projectId={projectId}
              connected={gscConnected}
              siteUrl={activation.gsc.siteUrl}
            />
          </TabsContent>
          <TabsContent value="backlinks" className="pt-4" keepMounted={false}>
            {activation.domain ? (
              <DashboardBacklinks
                key={activation.domain}
                projectId={projectId}
                domain={activation.domain}
              />
            ) : (
              <p>Add your website in project settings to see backlinks.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
