"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  WorkspaceBody,
  WorkspaceContainer,
  WorkspaceHeader,
} from "@/components/workspace/workspace-container";
import { useBots } from "@/core/bots";
import {
  RESUMABLE_RUN_STATUSES,
  useConsoleRuns,
  useConsoleStats,
  useResumeRun,
} from "@/core/console";
import { useGroupRooms } from "@/core/groups";
import { useI18n } from "@/core/i18n/hooks";
import { useModels } from "@/core/models/hooks";
import { useOpsResources, useOpsStatus, useOpsVersion } from "@/core/ops";
import { useScheduledTasks } from "@/core/scheduled-tasks/hooks";
import { pathOfThread } from "@/core/threads/utils";

function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatMiB(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1024) return `${(value / 1024).toFixed(1)} GiB`;
  return `${value} MiB`;
}

function Card({
  title,
  action,
  children,
}: Readonly<{
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}>) {
  return (
    <section className="min-w-0 rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium break-all text-right">{value}</span>
    </div>
  );
}

export default function OverviewPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { status } = useOpsStatus();
  const { version } = useOpsVersion();
  const { resources } = useOpsResources();
  const { stats } = useConsoleStats();
  const { runs } = useConsoleRuns();
  const { models } = useModels();
  const scheduledTasks = useScheduledTasks();
  const { rooms } = useGroupRooms();
  const { bots } = useBots();
  const resumeRun = useResumeRun();

  const tasks = Array.isArray(scheduledTasks.data) ? scheduledTasks.data : [];
  const enabledTasks = tasks.filter((task) => task.status !== "paused");

  const handleResume = async (threadId: string, runId: string) => {
    const resumed = await resumeRun.mutateAsync({ threadId, runId });
    router.push(pathOfThread(resumed.thread_id));
  };

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="w-full max-w-6xl space-y-2 p-4">
          <h1 className="text-xl font-semibold">{t.overview.title}</h1>
          <p className="text-muted-foreground text-sm">
            {t.overview.description}
          </p>
        </div>
        <div className="grid w-full max-w-6xl gap-4 p-4 md:grid-cols-2">
          <Card title={t.overview.runtime}>
            <Stat
              label={t.overview.service}
              value={status?.service ?? version?.service ?? "—"}
            />
            <Stat label={t.overview.version} value={version?.version ?? "—"} />
            <Stat
              label={t.overview.uptime}
              value={
                status ? formatUptime(status.uptime_seconds) : "—"
              }
            />
            <Stat
              label={t.overview.apiDocs}
              value={
                status
                  ? status.docs_enabled
                    ? t.overview.enabled
                    : t.overview.disabled
                  : "—"
              }
            />
          </Card>
          <Card title={t.overview.resources}>
            <Stat
              label={t.overview.platform}
              value={resources?.platform ?? "—"}
            />
            <Stat
              label={t.overview.cpu}
              value={resources?.cpu_count?.toString() ?? "—"}
            />
            <Stat
              label={t.overview.memory}
              value={
                resources
                  ? `${formatMiB(resources.memory.available_mb)} / ${formatMiB(resources.memory.total_mb)}`
                  : "—"
              }
            />
            <Stat
              label={t.overview.diskFree}
              value={
                resources?.disk
                  ? `${formatMiB(resources.disk.free_mb)} / ${formatMiB(resources.disk.total_mb)}`
                  : "—"
              }
            />
          </Card>
          <Card
            title={t.overview.models}
            action={
              <Link
                href="/workspace/agents"
                className="text-muted-foreground text-xs underline"
              >
                {t.overview.manage}
              </Link>
            }
          >
            {models.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t.overview.noModels}
              </p>
            ) : (
              <ul className="space-y-0.5">
                {models.slice(0, 8).map((model) => (
                  <li key={model.name} className="text-sm">
                    {model.display_name || model.name}
                  </li>
                ))}
                {models.length > 8 && (
                  <li className="text-muted-foreground text-xs">
                    {t.overview.moreModels(models.length - 8)}
                  </li>
                )}
              </ul>
            )}
          </Card>
          <Card title={t.overview.activity}>
            {stats ? (
              <>
                <Stat label={t.overview.runs} value={String(stats.total_runs)} />
                <Stat
                  label={t.overview.activeRuns}
                  value={String(stats.active_runs)}
                />
                <Stat label={t.overview.threads} value={String(stats.total_threads)} />
                <Stat label={t.overview.tokens} value={String(stats.total_tokens)} />
                <Stat
                  label={t.overview.cost}
                  value={
                    stats.total_cost === null
                      ? "—"
                      : `${stats.total_cost.toFixed(4)}${stats.currency ? ` ${stats.currency}` : ""}`
                  }
                />
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t.overview.statsUnavailable}
              </p>
            )}
            <h3 className="mt-3 mb-1 text-xs font-semibold">
              {t.overview.recentRuns}
            </h3>
            {runs.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t.overview.noRuns}
              </p>
            ) : (
              <ul className="space-y-1">
                {runs.map((run) => (
                  <li
                    key={run.run_id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <Link
                      href={pathOfThread(run.thread_id)}
                      className="min-w-0 flex-1 truncate underline-offset-2 hover:underline"
                    >
                      {run.thread_title ?? run.thread_id}{" "}
                      <span className="text-muted-foreground text-xs">
                        · {run.status}
                      </span>
                    </Link>
                    {RESUMABLE_RUN_STATUSES.has(run.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={resumeRun.isPending}
                        onClick={() => handleResume(run.thread_id, run.run_id)}
                      >
                        {resumeRun.isPending
                          ? t.overview.resuming
                          : t.overview.resume}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {resumeRun.isError && (
              <p className="text-destructive mt-1 text-xs">
                {resumeRun.error instanceof Error
                  ? resumeRun.error.message
                  : t.overview.resumeFailed}
              </p>
            )}
          </Card>
          <Card
            title={t.overview.scheduledTasks}
            action={
              <Link
                href="/workspace/scheduled-tasks"
                className="text-muted-foreground text-xs underline"
              >
                {t.overview.manage}
              </Link>
            }
          >
            <Stat label={t.overview.total} value={String(tasks.length)} />
            <Stat label={t.overview.enabledCount} value={String(enabledTasks.length)} />
          </Card>
          <Card
            title={t.overview.team}
            action={
              <Link
                href="/workspace/team"
                className="text-muted-foreground text-xs underline"
              >
                {t.overview.openTeam}
              </Link>
            }
          >
            <Stat label={t.overview.rooms} value={String(rooms.length)} />
            <Stat label={t.overview.bots} value={String(bots.length)} />
          </Card>
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
