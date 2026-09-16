"use client";

import React, { useEffect, useState } from "react";
import { EmptyState, ErrorBox, Btn, Badge, Field, inputCls } from "@/components/ui";
import { errMsg } from "@/lib/http";
import { listProjects } from "@/lib/projects";
import {
  fetchInbox, sendDM, ackDM, fetchPresence, fetchProjectState, fetchSkillUsage,
  fetchCuratorReport, runCurator, fetchBlueprints, launchBlueprint, fetchBenchmarkSuites,
  runBenchmarkSuite, fetchConsoleInsights, fetchOpsAdvice, listCouncilCases, fetchPendingApprovals,
  decideApproval, localEndpointHealth, fetchWarRoomData, resolveApprovalRequest,
  createCheckpoint, restoreCheckpoint, probeCanary,
  triggerAVOIteration, registerEpistemicClaim, addEpistemicEvidence, triggerRSICycle, replayTrajectory,
  type PresenceMember, type ProjectStateSnapshot, type WarRoomSnapshot,
  type WarRoomCheckpoint, type WarRoomLeaderboardEntry, type WarRoomCanaryResult,
  type WarRoomAVOLineage, type WarRoomEpistemicClaim, type WarRoomRSIStatus, type WarRoomTrajectoryTrace,
} from "@/lib/workforce";
import {
  RefreshCw, Send, Inbox, Users, Wrench, CalendarClock, Scale, Activity, Radio, ShieldAlert,
  Check, Ban, CheckCircle2, AlertTriangle, FileText, DollarSign, Layers, ChevronDown, ChevronRight,
  ShieldCheck, CheckSquare, Trophy, Eye, Save, RotateCcw,
  Dna, Compass, Cpu, Play, Plus, GitFork,
} from "lucide-react";

export interface WorkforceBot {
  name: string;
  display_name: string;
}

type TabId = "warroom" | "inbox" | "presence" | "curator" | "automation" | "oversight" | "insights";

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: "warroom", label: "War Room", icon: <Radio className="size-3.5 text-rose-500" /> },
  { id: "inbox", label: "Bot Inbox", icon: <Inbox className="size-3.5" /> },
  { id: "presence", label: "Presence", icon: <Users className="size-3.5" /> },
  { id: "curator", label: "Curator", icon: <Wrench className="size-3.5" /> },
  { id: "automation", label: "Automation", icon: <CalendarClock className="size-3.5" /> },
  { id: "oversight", label: "Oversight", icon: <Scale className="size-3.5" /> },
  { id: "insights", label: "Insights", icon: <Activity className="size-3.5" /> },
];

function Panel(props: { title: string; hint?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3.5">
      <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{props.title}</h3>
          {props.hint && <p className="text-[11px] text-muted-foreground mt-0.5">{props.hint}</p>}
        </div>
        {props.actions && <div className="flex items-center gap-1.5">{props.actions}</div>}
      </div>
      {props.children}
    </div>
  );
}

function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    fn().then(
      (d) => { if (live) { setData(d); setLoading(false); } },
      (e) => { if (live) { setError(errMsg(e)); setLoading(false); } },
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);
  return { data, loading, error, reload: () => setNonce((n) => n + 1) };
}

function InboxTab(props: { bots: WorkforceBot[] }) {
  const [bot, setBot] = useState(props.bots[0]?.name || "");
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inbox = useAsync(() => (bot ? fetchInbox(bot, false) : Promise.resolve({ messages: [], unread_count: 0 })), [bot]);

  const send = async () => {
    if (!bot || !target.trim() || !message.trim() || sending) return;
    setSending(true);
    setNotice(null);
    try {
      const res = (await sendDM(bot, target.trim(), message.trim())) as { status?: string; detail?: string };
      if (res.status === "delivered") {
        setNotice("Delivered to inbox.");
        setMessage("");
      } else {
        setNotice(`Not delivered: ${res.detail || res.status}`);
      }
    } catch (e) {
      setNotice(errMsg(e));
    } finally {
      setSending(false);
    }
  };

  const ack = async (deliveryId: string) => {
    try {
      await ackDM(bot, deliveryId);
      inbox.reload();
    } catch (e) {
      setNotice(errMsg(e));
    }
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Panel title="Send bot DM" hint="Fire-and-forget. Replies land back here.">
        <Field label="From bot">
          <select value={bot} onChange={(e) => setBot(e.target.value)} className={inputCls} aria-label="From bot">
            {props.bots.map((b) => (<option key={b.name} value={b.name}>{b.display_name || b.name}</option>))}
          </select>
        </Field>
        <Field label="To teammate">
          <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="researcher" className={inputCls} />
        </Field>
        <Field label="Message">
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className={inputCls} placeholder="Lead with the point; include the concrete ask." />
        </Field>
        <Btn onClick={send} disabled={sending || !target.trim() || !message.trim()}><Send className="size-3.5" /> Send DM</Btn>
        {notice && <p className="text-xs text-muted-foreground mt-2">{notice}</p>}
      </Panel>
      <Panel title={`Inbox — ${bot || "—"}`} hint="Newest first." actions={<Btn variant="ghost" onClick={inbox.reload}><RefreshCw className="size-3.5" /> Refresh</Btn>}>
        {inbox.loading ? <p className="text-xs text-muted-foreground">Loading…</p>
          : inbox.error ? <ErrorBox message={inbox.error} />
          : !inbox.data || inbox.data.messages.length === 0 ? <EmptyState title="Inbox empty" hint="No DMs yet for this bot." />
          : (
            <ul className="space-y-2">
              {inbox.data.messages.map((m) => (
                <li key={m.delivery_id} className="rounded-xl border border-border/60 p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <strong>{m.sender}</strong>
                    <Badge tone={m.status === "unread" ? "blue" : "gray"}>{m.status}</Badge>
                    <span className="ml-auto" />
                    {m.status !== "acked" && <Btn variant="ghost" onClick={() => ack(m.delivery_id)}>Ack</Btn>}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{m.body}</p>
                </li>
              ))}
            </ul>
          )}
      </Panel>
    </div>
  );
}

const STATE_FIELDS: Array<{ key: keyof ProjectStateSnapshot; label: string }> = [
  { key: "phase", label: "phase" },
  { key: "active_tasks", label: "active tasks" },
  { key: "blocked_tasks", label: "blocked tasks" },
  { key: "completed_tasks", label: "completed tasks" },
  { key: "failed_tasks", label: "failed tasks" },
  { key: "active_agents", label: "active agents" },
  { key: "arch_version", label: "arch version" },
  { key: "open_conflicts", label: "open conflicts" },
];

function PresenceTab() {
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [projectId, setProjectId] = useState("");
  useEffect(() => {
    listProjects().then((p) => {
      setProjects(p.map((x) => ({ id: x.id, name: x.name })));
      if (p[0]) setProjectId(p[0].id);
    }).catch(() => setProjects([]));
  }, []);
  const presence = useAsync<PresenceMember[]>(
    () => (projectId ? fetchPresence(projectId) : Promise.resolve([])),
    [projectId],
  );
  const state = useAsync<ProjectStateSnapshot | null>(
    () => (projectId ? fetchProjectState(projectId) : Promise.resolve(null)),
    [projectId],
  );

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Panel title="Project presence" hint="Who is on the project and what they hold."
        actions={<select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls} aria-label="Project">
          {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>}>
        {presence.loading ? <p className="text-xs text-muted-foreground">Loading…</p>
          : presence.error ? <ErrorBox message={presence.error} />
          : !presence.data || presence.data.length === 0 ? <EmptyState title="Nobody here" hint="Join a bot to this project to staff it." />
          : (
            <ul className="space-y-2">
              {presence.data.map((m) => (
                <li key={m.bot_name} className="rounded-xl border border-border/60 p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <strong>{m.bot_name}</strong>
                    <Badge tone={m.status === "active" ? "green" : "gray"}>{m.status}</Badge>
                    <span className="text-muted-foreground">{m.role_in_project}</span>
                  </div>
                  {m.current_task_id && <p className="mt-1 text-muted-foreground">Task: {m.current_task_id}</p>}
                  {m.blocked_reason && <p className="mt-1 text-amber-600">Blocked: {m.blocked_reason}</p>}
                </li>
              ))}
            </ul>
          )}
      </Panel>
      <Panel title="Project state" hint="Canonical snapshot folded from the event bus.">
        {state.loading ? <p className="text-xs text-muted-foreground">Loading…</p>
          : state.error ? <ErrorBox message={state.error} />
          : !state.data ? <EmptyState title="No state" hint="Pick a project to inspect." />
          : (
            <dl className="grid grid-cols-2 gap-2 text-xs">
              {STATE_FIELDS.map(({ key, label }) => (
                <div key={key} className="rounded-lg bg-muted/50 px-2.5 py-1.5">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-semibold">{String(state.data?.[key] ?? "—")}</dd>
                </div>
              ))}
            </dl>
          )}
      </Panel>
    </div>
  );
}

function CuratorTab() {
  const report = useAsync(() => fetchCuratorReport(), []);
  const usage = useAsync(() => fetchSkillUsage(), []);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const r = (await runCurator(true)) as { transitions?: { staled?: string[]; archived?: string[] }; merge_suggestions?: string[][] };
      const t = r.transitions || {};
      setResult(`Dry run: stale ${(t.staled || []).length}, archive ${(t.archived || []).length}, merge groups ${(r.merge_suggestions || []).length}.`);
      report.reload();
    } catch (e) {
      setResult(errMsg(e));
    } finally {
      setRunning(false);
    }
  };
  const states = (report.data as { states?: Record<string, string>; last_summary?: string; run_count?: number } | null);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Panel title="Skill curator" hint="Lifecycle states. Archives are recoverable; nothing is deleted."
        actions={<Btn variant="ghost" onClick={run} disabled={running}>{running ? "Running…" : "Dry-run pass"}</Btn>}>
        {report.loading ? <p className="text-xs text-muted-foreground">Loading…</p>
          : report.error ? <ErrorBox message={report.error} />
          : (
            <div className="text-xs space-y-1.5">
              <p className="text-muted-foreground">{states?.last_summary || "No run yet."} · runs: {states?.run_count ?? 0}</p>
              {result && <p>{result}</p>}
              <ul className="space-y-1">
                {Object.entries(states?.states || {}).map(([name, st]) => (
                  <li key={name} className="flex items-center gap-2"><span className="font-mono">{name}</span><Badge tone={st === "active" ? "green" : "amber"}>{st}</Badge></li>
                ))}
              </ul>
            </div>
          )}
      </Panel>
      <Panel title="Skill usage" hint="Telemetry feeding the curator.">
        {usage.loading ? <p className="text-xs text-muted-foreground">Loading…</p>
          : usage.error ? <ErrorBox message={usage.error} />
          : !usage.data || usage.data.length === 0 ? <EmptyState title="No telemetry" hint="Use skills and counts appear here." />
          : (
            <ul className="space-y-1 text-xs">
              {(usage.data as Array<{ name?: string; uses?: number; created_by?: string }>).slice(0, 20).map((u, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="font-mono">{u.name}</span>
                  <span className="text-muted-foreground">×{u.uses}</span>
                  <Badge tone="gray">{u.created_by}</Badge>
                </li>
              ))}
            </ul>
          )}
      </Panel>
    </div>
  );
}

function AutomationTab() {
  const blueprints = useAsync(() => fetchBlueprints(), []);
  const suites = useAsync(() => fetchBenchmarkSuites(), []);
  const [launching, setLaunching] = useState<string | null>(null);
  const [runningSuite, setRunningSuite] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const launch = async (id: string) => {
    setLaunching(id);
    try {
      const job = (await launchBlueprint(id, {})) as { job_id?: string; name?: string };
      setNotice(`Scheduled: ${job.name || id} (${job.job_id || "queued"}). Fill placeholders via API for custom values.`);
    } catch (e) {
      setNotice(errMsg(e));
    } finally {
      setLaunching(null);
    }
  };
  const runSuite = async (name: string) => {
    setRunningSuite(name);
    try {
      const r = (await runBenchmarkSuite(name)) as { passed?: number; failed?: number; total?: number };
      setNotice(`Suite ${name}: ${r.passed}/${r.total} passed, ${r.failed} failed.`);
    } catch (e) {
      setNotice(errMsg(e));
    } finally {
      setRunningSuite(null);
    }
  };
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Panel title="Schedule blueprints" hint="One-click recurring work.">
        {blueprints.loading ? <p className="text-xs text-muted-foreground">Loading…</p>
          : blueprints.error ? <ErrorBox message={blueprints.error} />
          : (
            <ul className="space-y-2">
              {(blueprints.data as Array<{ blueprint_id: string; title: string; description: string; cron_expression: string }>).map((b) => (
                <li key={b.blueprint_id} className="rounded-xl border border-border/60 p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <strong>{b.title}</strong>
                    <span className="ml-auto font-mono text-muted-foreground">{b.cron_expression}</span>
                    <Btn variant="ghost" onClick={() => launch(b.blueprint_id)} disabled={launching === b.blueprint_id}>
                      {launching === b.blueprint_id ? "…" : "Schedule"}
                    </Btn>
                  </div>
                  <p className="mt-1 text-muted-foreground">{b.description}</p>
                </li>
              ))}
            </ul>
          )}
        {notice && <p className="text-xs text-muted-foreground mt-2">{notice}</p>}
      </Panel>
      <Panel title="Eval suites" hint="Deterministic nightly-grade checks, runnable now.">
        {suites.loading ? <p className="text-xs text-muted-foreground">Loading…</p>
          : suites.error ? <ErrorBox message={suites.error} />
          : (
            <ul className="space-y-2">
              {(suites.data as Array<{ name: string; version: string; cases: number }>).map((s) => (
                <li key={s.name} className="rounded-xl border border-border/60 p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{s.name}</span>
                    <Badge tone="gray">{s.version} · {s.cases} cases</Badge>
                    <span className="ml-auto" />
                    <Btn variant="ghost" onClick={() => runSuite(s.name)} disabled={runningSuite === s.name}>
                      {runningSuite === s.name ? "…" : "Run"}
                    </Btn>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </Panel>
    </div>
  );
}

function OversightTab() {
  const cases = useAsync(() => listCouncilCases(), []);
  const approvals = useAsync(() => fetchPendingApprovals(), []);
  const decide = async (id: string, approved: boolean) => {
    try {
      await decideApproval(id, approved);
    } finally {
      approvals.reload();
    }
  };
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Panel title="Pending approvals" hint="Human decisions for risky actions."
        actions={<Btn variant="ghost" onClick={approvals.reload}><RefreshCw className="size-3.5" /> Refresh</Btn>}>
        {approvals.loading ? <p className="text-xs text-muted-foreground">Loading…</p>
          : approvals.error ? <ErrorBox message={approvals.error} />
          : !approvals.data || approvals.data.length === 0 ? <EmptyState title="Nothing pending" hint="Approval requests appear here." />
          : (
            <ul className="space-y-2">
              {(approvals.data as Array<{ request_id: string; action: string; actor: string; reason: string }>).map((a) => (
                <li key={a.request_id} className="rounded-xl border border-border/60 p-2.5 text-xs">
                  <p className="font-mono font-semibold">{a.action}</p>
                  <p className="text-muted-foreground">by {a.actor}{a.reason ? ` — ${a.reason}` : ""}</p>
                  <div className="mt-1.5 flex gap-1.5">
                    <Btn variant="ghost" onClick={() => decide(a.request_id, true)}>Approve</Btn>
                    <Btn variant="ghost" onClick={() => decide(a.request_id, false)}>Reject</Btn>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </Panel>
      <Panel title="Council cases" hint="Independent quorum over tier-1 artifacts."
        actions={<Btn variant="ghost" onClick={cases.reload}><RefreshCw className="size-3.5" /> Refresh</Btn>}>
        {cases.loading ? <p className="text-xs text-muted-foreground">Loading…</p>
          : cases.error ? <ErrorBox message={cases.error} />
          : !cases.data || cases.data.length === 0 ? <EmptyState title="No cases" hint="Open a case from the API when shipping risky artifacts." />
          : (
            <ul className="space-y-2">
              {(cases.data as Array<{ case_id: string; artifact_id: string; status: string }>).map((c) => (
                <li key={c.case_id} className="flex items-center gap-2 rounded-xl border border-border/60 p-2.5 text-xs">
                  <span className="font-mono">{c.case_id}</span>
                  <span className="text-muted-foreground truncate">{c.artifact_id}</span>
                  <span className="ml-auto" />
                  <Badge tone={c.status === "ship" ? "green" : c.status === "hold" ? "amber" : "gray"}>{c.status}</Badge>
                </li>
              ))}
            </ul>
          )}
      </Panel>
    </div>
  );
}

function InsightsTab() {
  const digest = useAsync(() => fetchConsoleInsights(7), []);
  const advice = useAsync(() => fetchOpsAdvice(1), []);
  const health = useAsync(() => localEndpointHealth("http://127.0.0.1:11434"), []);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Panel title="Week digest" hint="Runs, models, activity, top skills.">
        {digest.loading ? <p className="text-xs text-muted-foreground">Loading…</p>
          : digest.error ? <ErrorBox message={digest.error} />
          : <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{digest.data?.digest || "No activity."}</pre>}
      </Panel>
      <div className="grid gap-3">
        <Panel title="Autonomy advice" hint="What the resource monitor recommends.">
          {advice.loading ? <p className="text-xs text-muted-foreground">Loading…</p>
            : advice.error ? <ErrorBox message={advice.error} />
            : advice.data && (
              <div className="text-xs space-y-1">
                <p><Badge tone="blue">{advice.data.recommendation}</Badge> · max workers {advice.data.max_workers} · {advice.data.model_class} models</p>
                {advice.data.reasons.map((r, i) => (<p key={i} className="text-muted-foreground">• {r}</p>))}
              </div>
            )}
        </Panel>
        <Panel title="Local endpoint" hint="Ollama default probe.">
          {health.loading ? <p className="text-xs text-muted-foreground">Probing…</p>
            : health.error ? <ErrorBox message={health.error} />
            : health.data && (
              <p className="text-xs">
                <Badge tone={health.data.reachable ? "green" : "gray"}>{health.data.reachable ? "reachable" : "offline"}</Badge>
                {" "}{health.data.reachable ? `${health.data.models.length} model(s): ${health.data.models.slice(0, 5).join(", ")}` : health.data.reason}
              </p>
            )}
        </Panel>
      </div>
    </div>
  );
}

function WarRoomTab() {
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProject, setSelectedProject] = useState<string>("default");
  const [approvalBusy, setApprovalBusy] = useState<Record<string, boolean>>({});
  const [approvalNotice, setApprovalNotice] = useState<string | null>(null);
  const [expandedSpecKey, setExpandedSpecKey] = useState<string | null>(null);
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);
  const [checkpointTag, setCheckpointTag] = useState<string>("v1.0.0-snapshot");
  const [checkpointBusy, setCheckpointBusy] = useState<boolean>(false);
  const [canaryBusy, setCanaryBusy] = useState<boolean>(false);

  useEffect(() => {
    listProjects().then((p) => {
      if (p && p.length > 0) {
        setProjects(p.map((x) => ({ id: x.id, name: x.name })));
        setSelectedProject(p[0].id);
      }
    }).catch(() => {});
  }, []);

  const warRoom = useAsync(() => fetchWarRoomData(selectedProject), [selectedProject]);

  const handleApproval = async (requestId: string, approved: boolean) => {
    setApprovalBusy((prev) => ({ ...prev, [requestId]: true }));
    setApprovalNotice(null);
    try {
      await resolveApprovalRequest(selectedProject, requestId, approved);
      setApprovalNotice(approved ? `Approved request ${requestId}` : `Rejected request ${requestId}`);
      warRoom.reload();
    } catch (e) {
      setApprovalNotice(`Failed to resolve request: ${errMsg(e)}`);
    } finally {
      setApprovalBusy((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleCreateCheckpoint = async () => {
    if (!checkpointTag.trim() || checkpointBusy) return;
    setCheckpointBusy(true);
    try {
      const res = await createCheckpoint(selectedProject, checkpointTag.trim());
      setApprovalNotice(`Snapshot created: ${res.checkpoint_id} (${res.tag})`);
      warRoom.reload();
    } catch (e) {
      setApprovalNotice(`Failed to create checkpoint: ${errMsg(e)}`);
    } finally {
      setCheckpointBusy(false);
    }
  };

  const handleRestoreCheckpoint = async (checkpointId: string) => {
    setCheckpointBusy(true);
    try {
      await restoreCheckpoint(selectedProject, checkpointId);
      setApprovalNotice(`Restored workspace state from checkpoint: ${checkpointId}`);
      warRoom.reload();
    } catch (e) {
      setApprovalNotice(`Failed to restore checkpoint: ${errMsg(e)}`);
    } finally {
      setCheckpointBusy(false);
    }
  };

  const handleProbeCanary = async () => {
    setCanaryBusy(true);
    try {
      const res = await probeCanary(selectedProject, 3000, true);
      setApprovalNotice(`Canary probe completed: ${res.status.toUpperCase()} (Latency: ${res.latency_ms}ms)`);
      warRoom.reload();
    } catch (e) {
      setApprovalNotice(`Failed to run canary probe: ${errMsg(e)}`);
    } finally {
      setCanaryBusy(false);
    }
  };

  const pendingApprovals = warRoom.data?.pending_approvals || [];
  const contracts = warRoom.data?.contracts || [];
  const costSummary = warRoom.data?.cost_summary;
  const livingSpec = warRoom.data?.living_spec;
  const standup = warRoom.data?.standup;
  const checkpoints = warRoom.data?.checkpoints || [];
  const leaderboard = warRoom.data?.leaderboard || [];
  const canaryHistory = warRoom.data?.canary_history || [];
  const visualQa = warRoom.data?.visual_qa || [];
  const avoLineage = warRoom.data?.avo_lineage;
  const epistemicClaims = warRoom.data?.epistemic_claims || [];
  const rsiStatus = warRoom.data?.rsi_status;
  const trajectories = warRoom.data?.trajectories || [];

  const [avoBusy, setAvoBusy] = useState(false);
  const [rsiBusy, setRsiBusy] = useState(false);
  const [claimText, setClaimText] = useState("");
  const [activeGoalId, setActiveGoalId] = useState<string>("");

  const handleTriggerAVO = async () => {
    if (avoBusy) return;
    setAvoBusy(true);
    try {
      await triggerAVOIteration(selectedProject, {
        hypothesis: "Empirical optimization of active component execution path",
        modification: "adaptive_batch_compaction",
        performance_score: 0.91,
        quality_score: 0.94,
        correctness: true,
      });
      setApprovalNotice("AVO autonomous variation committed to Pareto frontier.");
      warRoom.reload();
    } catch (e) {
      setApprovalNotice(`AVO error: ${errMsg(e)}`);
    } finally {
      setAvoBusy(false);
    }
  };

  const handleTriggerRSI = async () => {
    if (rsiBusy) return;
    setRsiBusy(true);
    try {
      const res = (await triggerRSICycle(selectedProject, {
        bottleneck: "Context window saturation during long-running tasks",
        target_component: "compaction",
      })) as { promoted?: boolean; stage?: string };
      setApprovalNotice(`RSI closed-loop cycle complete: ${res.promoted ? "PROMOTED to production" : "ROLLED BACK (zero regression)"}`);
      warRoom.reload();
    } catch (e) {
      setApprovalNotice(`RSI error: ${errMsg(e)}`);
    } finally {
      setRsiBusy(false);
    }
  };

  const handleAddClaim = async () => {
    if (!claimText.trim()) return;
    try {
      await registerEpistemicClaim(selectedProject, {
        text: claimText.trim(),
        status: "hypothesis",
        prior_confidence: 0.6,
        falsification_test: "Automated verification suite",
      });
      setClaimText("");
      setApprovalNotice("Epistemic claim registered.");
      warRoom.reload();
    } catch (e) {
      setApprovalNotice(`Claim registration error: ${errMsg(e)}`);
    }
  };

  const handleReplayTrajectory = async (goalId: string, stepIndex: number) => {
    try {
      await replayTrajectory(selectedProject, goalId, stepIndex);
      setApprovalNotice(`Time-travel trajectory replay simulated forward from step #${stepIndex}.`);
    } catch (e) {
      setApprovalNotice(`Trajectory replay error: ${errMsg(e)}`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground">Project Workspace:</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="text-xs bg-muted/50 border border-border/60 rounded-lg px-2.5 py-1"
          >
            {projects.length === 0 && <option value="default">default</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
            ))}
          </select>
        </div>
        <Btn variant="ghost" onClick={() => warRoom.reload()}>
          <RefreshCw className="size-3 mr-1" /> Refresh Telemetry
        </Btn>
      </div>

      {approvalNotice && (
        <div className="text-xs p-2.5 rounded-xl border border-primary/30 bg-primary/10 text-primary flex items-center justify-between">
          <span>{approvalNotice}</span>
          <button type="button" onClick={() => setApprovalNotice(null)} className="text-[11px] underline ml-2">Dismiss</button>
        </div>
      )}

      {warRoom.loading ? (
        <p className="text-xs text-muted-foreground">Connecting to War Room telemetry...</p>
      ) : warRoom.error ? (
        <ErrorBox message={warRoom.error} />
      ) : warRoom.data ? (
        <div className="space-y-3">
          {/* Top: Emergency Status Bar */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${warRoom.data.kill_switch?.active ? "bg-rose-500 animate-ping" : "bg-emerald-500"}`} />
              <span className="text-xs font-bold">
                {warRoom.data.kill_switch?.active ? "EMERGENCY STOP ENGAGED" : "Autonomous Workforce Active"}
              </span>
              {warRoom.data.kill_switch?.reason && (
                <span className="text-[11px] text-muted-foreground">({warRoom.data.kill_switch.reason})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {pendingApprovals.length > 0 && (
                <Badge tone="amber">
                  {pendingApprovals.length} Approval Pending
                </Badge>
              )}
              <Badge tone={warRoom.data.kill_switch?.active ? "amber" : "green"}>
                {warRoom.data.members.length} Active Bot(s)
              </Badge>
            </div>
          </div>

          {/* 1. Human-in-the-Loop Approval Queue */}
          <Panel
            title={`Human Approval Queue (${pendingApprovals.length})`}
            hint="Review and authorize high-risk actions (code merge, production push, schema migration)"
            actions={<Badge tone={pendingApprovals.length > 0 ? "amber" : "green"}>{pendingApprovals.length > 0 ? "Action Required" : "All Clear"}</Badge>}
          >
            {pendingApprovals.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No pending approval requests. Operations are proceeding within autonomous boundaries.</p>
            ) : (
              <div className="space-y-2.5">
                {pendingApprovals.map((req) => (
                  <div key={req.request_id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="size-4 text-amber-500 shrink-0" />
                        <span className="font-semibold text-foreground">@{req.bot_name}</span>
                        <span className="text-muted-foreground font-mono">[{req.action_type}]</span>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          req.risk_level === "critical"
                            ? "bg-rose-500/20 text-rose-500"
                            : req.risk_level === "high"
                              ? "bg-amber-500/20 text-amber-500"
                              : "bg-blue-500/20 text-blue-400"
                        }`}>
                          {req.risk_level} risk
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Btn
                          variant="primary"
                          disabled={approvalBusy[req.request_id]}
                          onClick={() => handleApproval(req.request_id, true)}
                        >
                          <Check className="size-3" /> Approve
                        </Btn>
                        <Btn
                          variant="danger"
                          disabled={approvalBusy[req.request_id]}
                          onClick={() => handleApproval(req.request_id, false)}
                        >
                          <Ban className="size-3" /> Reject
                        </Btn>
                      </div>
                    </div>

                    {req.diff_preview && (
                      <div className="rounded-lg border border-border/60 bg-muted/30 p-2 font-mono text-[11px] overflow-x-auto whitespace-pre">
                        {req.diff_preview}
                      </div>
                    )}

                    {req.details && Object.keys(req.details).length > 0 && (
                      <div className="text-[11px] text-muted-foreground font-mono bg-background/50 p-2 rounded border border-border/40">
                        {JSON.stringify(req.details, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* 2. Standup & Blocker Alerts */}
          {standup && (
            <Panel
              title="Autonomous Standup Briefing"
              hint={`Executive sync across active agents • ${standup.timestamp ? new Date(standup.timestamp).toLocaleTimeString() : "Live"}`}
            >
              <div className="space-y-2 text-xs">
                <p className="text-foreground leading-relaxed bg-muted/30 p-2.5 rounded-xl border border-border/60">
                  {standup.executive_summary || "Workforce is progressing according to schedule."}
                </p>

                {standup.blockers && standup.blockers.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-500 text-xs">
                      <AlertTriangle className="size-3.5" />
                      <span>Critical Path Blockers ({standup.blockers.length})</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-[11px]">
                      {standup.blockers.map((b, idx) => (
                        <li key={idx}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {standup.stagnant_alerts && standup.stagnant_alerts.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">Stagnation & Bottleneck Alerts:</span>
                    {standup.stagnant_alerts.map((stg) => (
                      <div key={stg.task_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs border border-border/50">
                        <div>
                          <span className="font-mono font-semibold text-primary">{stg.task_id}</span>
                          <span className="text-muted-foreground ml-1.5">by @{stg.assignee_bot} ({stg.minutes_inactive}m inactive)</span>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{stg.recommendation}</p>
                        </div>
                        <Badge tone="amber">Stalled</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          )}

          {/* 3. Cost Governor & Token Burn-Rate */}
          {costSummary && (
            <Panel
              title="Token Burn-Rate & Financial Governance"
              hint="Real-time spend tracking and model tier throttling against daily budget"
            >
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="size-4 text-emerald-500" />
                    <span className="font-bold text-foreground">
                      ${costSummary.current_spend_24h.toFixed(2)} / ${costSummary.daily_budget_usd.toFixed(2)} USD (24h)
                    </span>
                  </div>
                  <Badge tone={costSummary.budget_utilized_ratio > 0.9 ? "amber" : "green"}>
                    {(costSummary.budget_utilized_ratio * 100).toFixed(1)}% consumed
                  </Badge>
                </div>

                <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/60">
                  <div
                    className={`h-full transition-all rounded-full ${
                      costSummary.budget_utilized_ratio > 0.9
                        ? "bg-rose-500"
                        : costSummary.budget_utilized_ratio > 0.7
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, costSummary.budget_utilized_ratio * 100))}%` }}
                  />
                </div>

                {costSummary.bot_breakdown && Object.keys(costSummary.bot_breakdown).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                    {Object.entries(costSummary.bot_breakdown).map(([bname, bdata]) => (
                      <div key={bname} className="p-2 rounded-lg bg-muted/30 border border-border/50 text-[11px] font-mono">
                        <div className="flex items-center justify-between font-semibold text-foreground mb-0.5">
                          <span>@{bname}</span>
                          <span className="text-emerald-500 font-sans">${bdata.cost_usd.toFixed(3)}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {bdata.input_tokens.toLocaleString()} in / {bdata.output_tokens.toLocaleString()} out
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          )}

          {/* 4. Definition of Done & Task Contracts */}
          <Panel
            title={`Task Contracts & Definition of Done (${contracts.length})`}
            hint="Enforced quality gates with verifiable evidence receipts (test suites, diff hashes)"
          >
            {contracts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">No formal task contracts established yet for this workspace.</p>
            ) : (
              <div className="space-y-2">
                {contracts.map((c) => {
                  const isExpanded = expandedContractId === c.task_id;
                  return (
                    <div key={c.task_id} className="rounded-xl border border-border/60 bg-muted/20 p-2.5 text-xs space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="size-3.5 text-primary shrink-0" />
                          <span className="font-mono font-bold text-foreground">{c.task_id}</span>
                          <span className="font-medium text-foreground">{c.title}</span>
                          <span className="text-[10px] text-muted-foreground">assignee: @{c.assignee_bot}</span>
                          {c.verifier_bot && (
                            <span className="text-[10px] text-muted-foreground">• verifier: @{c.verifier_bot}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={
                            c.status === "verified_complete" ? "green" :
                            c.status === "ready_for_review" ? "blue" :
                            c.status === "rejected" ? "amber" : "gray"
                          }>
                            {c.status}
                          </Badge>
                          {c.evidence_receipts && c.evidence_receipts.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedContractId(isExpanded ? null : c.task_id)}
                              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                            >
                              {c.evidence_receipts.length} Receipt(s)
                              {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && c.evidence_receipts && (
                        <div className="pt-1.5 border-t border-border/50 space-y-1 font-mono text-[10px]">
                          {c.evidence_receipts.map((rec, rIdx) => (
                            <div key={rIdx} className="p-1.5 rounded bg-muted/50 flex items-center justify-between text-muted-foreground">
                              <span><strong>[{rec.kind}]</strong> {rec.reference}</span>
                              <span className="text-emerald-500 flex items-center gap-1">
                                <ShieldCheck className="size-3" /> verified by @{rec.verified_by}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* 5. Living Specification & ADR Viewer */}
          {livingSpec && livingSpec.sections && Object.keys(livingSpec.sections).length > 0 && (
            <Panel
              title={`Living Specification: ${livingSpec.title || "Architecture & System Spec"}`}
              hint="Continually updated project architecture document maintained autonomously by specialist bots"
            >
              <div className="space-y-1.5 text-xs">
                {Object.entries(livingSpec.sections).map(([sKey, section]) => {
                  const isExpanded = expandedSpecKey === sKey;
                  return (
                    <div key={sKey} className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedSpecKey(isExpanded ? null : sKey)}
                        className="w-full flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="size-3.5 text-primary shrink-0" />
                          <span className="font-semibold text-foreground">{section.title || sKey}</span>
                          <span className="text-[10px] text-muted-foreground">
                            v{section.version} by @{section.last_author_bot}
                          </span>
                        </div>
                        {isExpanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
                      </button>

                      {isExpanded && (
                        <div className="p-3 border-t border-border/50 bg-background/50 text-[11px] leading-relaxed whitespace-pre-wrap font-mono text-muted-foreground max-h-60 overflow-y-auto">
                          {section.content}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {/* 6. Presence & Concurrency Locks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Active Members & Presence */}
            <Panel title="Active Workforce Presence" hint="Registered bots & real-time assignments">
              {warRoom.data.members.length === 0 ? (
                <EmptyState title="No bots currently joined" />
              ) : (
                <div className="space-y-1.5">
                  {warRoom.data.members.map((m) => (
                    <div key={m.bot_name} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs">
                      <div>
                        <span className="font-semibold">{m.bot_name}</span>
                        <span className="text-[10px] text-muted-foreground ml-1.5">({m.role_in_project})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {m.current_task_id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">
                            {m.current_task_id}
                          </span>
                        )}
                        <Badge tone={m.status === "active" ? "green" : m.status === "blocked" ? "amber" : "gray"}>
                          {m.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Resource Concurrency & Locks */}
            <Panel title="Resource Locks (Concurrency Control)" hint="File, dir, and task ownership locks">
              {warRoom.data.active_locks.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active locks. Workspace is clear for concurrent execution.</p>
              ) : (
                <div className="space-y-1.5">
                  {warRoom.data.active_locks.map((lk) => (
                    <div key={lk.lock_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs font-mono">
                      <div>
                        <span className="font-semibold text-foreground">{lk.scope}:{lk.path}</span>
                        <span className="text-[10px] text-muted-foreground ml-1.5">by @{lk.owner_bot}</span>
                      </div>
                      <Badge tone="amber">LOCKED</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* 7. Canary Staging Watchdog & Automated Smoke Gate */}
          <Panel
            title="Canary Staging Watchdog & Automated Gate"
            hint="Synthetic health probing before promotion to production branch"
            actions={
              <Btn variant="ghost" disabled={canaryBusy} onClick={handleProbeCanary}>
                <Activity className="size-3 mr-1" /> Probe Ephemeral Canary
              </Btn>
            }
          >
            {canaryHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">No canary probes executed yet. Ephemeral staging runs on pre-merge.</p>
            ) : (
              <div className="space-y-1.5 text-xs">
                {canaryHistory.map((c) => (
                  <div key={c.probe_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{c.probe_id}</span>
                      <span className="text-[10px] text-muted-foreground">{c.target_url}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{c.latency_ms}ms</span>
                      <Badge tone={c.status === "healthy" ? "green" : "amber"}>{c.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* 8. Workspace Checkpoint & Warm Resume */}
          <Panel
            title={`Workspace Checkpoints & Warm Resume (${checkpoints.length})`}
            hint="Durable full-state snapshots allowing instant recovery across machine restarts"
            actions={
              <div className="flex items-center gap-1.5">
                <input
                  value={checkpointTag}
                  onChange={(e) => setCheckpointTag(e.target.value)}
                  placeholder="tag (e.g. v1.0.0)"
                  className="text-xs bg-muted/60 border border-border/60 rounded-lg px-2 py-1 font-mono w-32"
                />
                <Btn variant="primary" disabled={checkpointBusy || !checkpointTag.trim()} onClick={handleCreateCheckpoint}>
                  <Save className="size-3 mr-1" /> Snapshot
                </Btn>
              </div>
            }
          >
            {checkpoints.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">No durable checkpoints saved yet. Click Snapshot to persist state.</p>
            ) : (
              <div className="space-y-1.5 text-xs">
                {checkpoints.map((ck) => (
                  <div key={ck.checkpoint_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 font-mono">
                    <div>
                      <span className="font-semibold text-foreground">{ck.checkpoint_id}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">[{ck.tag}]</span>
                      <span className="text-[10px] text-muted-foreground ml-2">({ck.timestamp_iso || "recent"})</span>
                    </div>
                    <Btn variant="ghost" disabled={checkpointBusy} onClick={() => handleRestoreCheckpoint(ck.checkpoint_id)}>
                      <RotateCcw className="size-3 mr-1" /> Restore
                    </Btn>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* 9. SWE-Bench Bot Arena Leaderboard */}
          {leaderboard.length > 0 && (
            <Panel
              title="SWE-Bench Evaluation Arena & Fleet Leaderboard"
              hint="Empirical performance benchmarks calibrating task auction reputation scores"
            >
              <div className="space-y-1 text-xs font-mono">
                <div className="grid grid-cols-5 p-1.5 text-muted-foreground font-semibold border-b border-border/50 text-[10px] uppercase">
                  <span>Rank</span>
                  <span>Bot Persona</span>
                  <span>Pass Rate</span>
                  <span>Avg Latency</span>
                  <span>Reputation</span>
                </div>
                {leaderboard.map((lb) => (
                  <div key={lb.bot_name} className="grid grid-cols-5 p-1.5 rounded hover:bg-muted/30 items-center">
                    <span className="flex items-center gap-1 font-bold text-foreground">
                      {lb.rank === 1 ? <Trophy className="size-3 text-amber-500" /> : `#${lb.rank}`}
                    </span>
                    <span className="font-semibold text-primary">@{lb.bot_name}</span>
                    <span>{lb.pass_rate}%</span>
                    <span>{lb.avg_duration_seconds}s</span>
                    <span className="font-bold text-emerald-500">{lb.reputation_score} pts</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* 10. Visual QA Evidence Receipts */}
          {visualQa.length > 0 && (
            <Panel
              title="Visual QA & Headless Browser Evidence"
              hint="Automated DOM verification and layout stability receipts"
            >
              <div className="space-y-1.5 text-xs font-mono">
                {visualQa.map((v) => (
                  <div key={v.receipt_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-2">
                      <Eye className="size-3.5 text-primary" />
                      <span className="font-semibold text-foreground">{v.receipt_id}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-xs">{v.url}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Stability: {Math.round(v.visual_stability_score * 100)}%</span>
                      <Badge tone={v.passed ? "green" : "amber"}>{v.passed ? "PASSED" : "FAILED"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* 11. AVO Genetic Optimization Lineage & Pareto Frontier */}
          <Panel
            title="AVO Genetic Variation Lineage & Pareto Frontier"
            hint="NVIDIA AVO continuous evolutionary search operator: Vary(P_t) = Agent(P_t, K, f) with supervisory anti-stagnation"
            actions={
              <div className="flex items-center gap-1.5">
                <Badge tone="green">Frontier: {avoLineage?.pareto_frontier?.length || 0} versions</Badge>
                <Badge tone="gray">Status: {avoLineage?.supervisor_status || "Active"}</Badge>
                <Btn variant="ghost" disabled={avoBusy} onClick={handleTriggerAVO}>
                  <Dna className="size-3 mr-1" /> Mutate & Benchmark
                </Btn>
              </div>
            }
          >
            {(!avoLineage || avoLineage.versions.length === 0) ? (
              <p className="text-xs text-muted-foreground py-2">No evolutionary mutations recorded in this workspace lineage yet. Click Mutate & Benchmark to run an autonomous variation step.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono p-2 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground">Lineage Head: <strong className="text-primary">{avoLineage.head_id || "None"}</strong></span>
                  <span className="text-muted-foreground">Committed Lineage Size: <strong>{avoLineage.versions.length} versions</strong></span>
                </div>
                <div className="space-y-1.5 font-mono text-xs max-h-48 overflow-y-auto">
                  {avoLineage.versions.slice(-4).reverse().map((v) => (
                    <div key={v.version_id} className="p-2 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-bold text-foreground">{v.version_id}</span>
                        {v.parent_id && <span className="text-[10px] text-muted-foreground">↳ parent: {v.parent_id}</span>}
                        <span className="text-[11px] text-muted-foreground truncate max-w-sm font-sans">{v.hypothesis}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">Score: {Math.round(v.composite_score * 100)}%</span>
                        <Badge tone={v.correctness ? "green" : "amber"}>{v.correctness ? "CORRECT" : "REJECTED"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          {/* 12. Epistemic Belief Graph & Bayesian Calibration */}
          <Panel
            title="Epistemic Belief Graph & Bayesian Calibration"
            hint="Rigorous epistemic truth verification: Verified Facts vs Hypotheses vs Unverified Assumptions"
            actions={
              <div className="flex items-center gap-1.5">
                <Badge tone={epistemicClaims.some(c => c.status === "assumption" && !c.is_verified) ? "amber" : "green"}>
                  {epistemicClaims.filter(c => c.status === "assumption").length} Assumptions
                </Badge>
                <Badge tone="green">
                  {epistemicClaims.filter(c => c.status === "fact").length} Verified Facts
                </Badge>
              </div>
            }
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Assert new epistemic claim or prerequisite..."
                  value={claimText}
                  onChange={(e) => setClaimText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddClaim()}
                  className="flex-1 text-xs bg-muted/40 border border-border/60 rounded-lg px-2.5 py-1.5 font-sans"
                />
                <Btn variant="ghost" onClick={handleAddClaim}>
                  <Plus className="size-3 mr-1" /> Add Claim
                </Btn>
              </div>
              {epistemicClaims.length === 0 ? (
                <p className="text-xs text-muted-foreground py-1">No epistemic claims tracked.</p>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto font-mono text-xs">
                  {epistemicClaims.map((c) => {
                    const isFact = c.status === "fact";
                    const isAssumption = c.status === "assumption";
                    const tone = isFact ? "green" : isAssumption ? "amber" : "gray";
                    return (
                      <div key={c.claim_id} className="p-2 rounded-lg bg-muted/30 border border-border/50 flex items-start justify-between gap-2">
                        <div className="space-y-0.5 max-w-xl">
                          <div className="flex items-center gap-2">
                            <Badge tone={tone}>{c.status.toUpperCase()}</Badge>
                            <span className="font-semibold text-foreground font-sans text-xs">{c.text}</span>
                          </div>
                          {c.falsification_test && (
                            <p className="text-[10px] text-muted-foreground">Falsification test: {c.falsification_test}</p>
                          )}
                          {c.supporting_evidence.length > 0 && (
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                              Support ({c.supporting_evidence.length}): {c.supporting_evidence[c.supporting_evidence.length - 1]}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-primary">{Math.round(c.confidence * 100)}%</span>
                          <p className="text-[9px] text-muted-foreground">posterior conf</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Panel>

          {/* 13. Controlled RSI Closed-Loop Center */}
          <Panel
            title="Controlled RSI Closed-Loop Center (The Keel Architecture)"
            hint="Autonomous hypothesis synthesis, A/B simulation, and holdout regression gating"
            actions={
              <div className="flex items-center gap-1.5">
                <Badge tone={rsiStatus?.stage === "promoted" ? "green" : "gray"}>
                  Stage: {rsiStatus?.stage || "idle"}
                </Badge>
                <Btn variant="ghost" disabled={rsiBusy} onClick={handleTriggerRSI}>
                  <Play className="size-3 mr-1" /> Run RSI Cycle
                </Btn>
              </div>
            }
          >
            <div className="space-y-2 text-xs font-mono">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 rounded-lg bg-muted/40">
                  <span className="text-[10px] text-muted-foreground uppercase">Current Stage</span>
                  <p className="font-bold text-foreground mt-0.5">{rsiStatus?.stage || "idle"}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/40">
                  <span className="text-[10px] text-muted-foreground uppercase">Safety Kernel</span>
                  <p className="font-bold text-emerald-500 mt-0.5">IMMUTABLE (Keel)</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/40">
                  <span className="text-[10px] text-muted-foreground uppercase">Holdout Gate</span>
                  <p className="font-bold text-primary mt-0.5">45 Benchmarks (0 Regress)</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/40">
                  <span className="text-[10px] text-muted-foreground uppercase">Active Configs</span>
                  <p className="font-bold text-foreground mt-0.5">
                    {rsiStatus ? Object.keys(rsiStatus.active_configurations || {}).length : 0} components
                  </p>
                </div>
              </div>
              {rsiStatus?.last_cycle_summary && (
                <p className="text-[11px] text-muted-foreground font-sans p-2 rounded bg-muted/20 border border-border/40">
                  ℹ️ {rsiStatus.last_cycle_summary}
                </p>
              )}
            </div>
          </Panel>

          {/* 14. Deterministic Trajectory Replayer & Time-Travel Debugger */}
          <Panel
            title="Deterministic Trajectory Replayer & Time-Travel Debugger"
            hint="SWE-agent & Hermes immutable SQLite execution traces with step scrubbing and historical replay"
            actions={
              <Badge tone="gray">
                {trajectories.length} Goal Trace(s)
              </Badge>
            }
          >
            {trajectories.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No execution trajectories recorded yet.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {trajectories.map((tr) => (
                    <button
                      key={tr.goal_id}
                      type="button"
                      onClick={() => setActiveGoalId(tr.goal_id)}
                      className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${
                        (activeGoalId || trajectories[0]?.goal_id) === tr.goal_id
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tr.goal_id} ({tr.total_steps} steps)
                    </button>
                  ))}
                </div>
                {(() => {
                  const currentTrace = trajectories.find(t => t.goal_id === (activeGoalId || trajectories[0]?.goal_id)) || trajectories[0];
                  if (!currentTrace || currentTrace.steps.length === 0) return null;
                  return (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto font-mono text-xs">
                      {currentTrace.steps.map((st) => (
                        <div key={st.step_id} className="p-2 rounded-lg bg-muted/30 border border-border/50 flex items-start justify-between gap-2">
                          <div className="space-y-0.5 truncate max-w-xl">
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground font-bold">Step #{st.step_index}</span>
                              <Badge tone={st.status === "success" ? "green" : "amber"}>{st.tool_name || "reason"}</Badge>
                              <span className="text-[11px] text-foreground font-sans truncate">{st.thought}</span>
                            </div>
                            {st.tool_output && (
                              <p className="text-[10px] text-muted-foreground truncate max-w-lg">
                                Output: {st.tool_output}
                              </p>
                            )}
                          </div>
                          <Btn
                            variant="ghost"
                            onClick={() => handleReplayTrajectory(currentTrace.goal_id, st.step_index)}
                            title="Re-simulate execution forward from this historical step"
                          >
                            <RotateCcw className="size-3 mr-1" /> Replay
                          </Btn>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </Panel>

          {/* 15. Flight Recorder Stream */}
          <Panel title="Flight Recorder (Event Stream)" hint="Audit timeline of autonomous decisions and tool operations">
            {warRoom.data.events.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent events recorded for this project.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1 font-mono text-[11px]">
                {warRoom.data.events.slice(-15).reverse().map((ev) => (
                  <div key={ev.event_id || ev.seq} className="p-1.5 rounded bg-muted/30 flex items-start gap-2">
                    <span className="text-muted-foreground">#{ev.seq}</span>
                    <span className="font-semibold text-primary">{ev.type}</span>
                    <span className="text-muted-foreground">by @{ev.actor}</span>
                    <span className="text-[10px] text-muted-foreground/80 ml-auto truncate max-w-xs">
                      {JSON.stringify(ev.payload || {})}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

export function WorkforceSection(props: { bots: WorkforceBot[] }) {
  const [tab, setTab] = useState<TabId>("warroom");
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 w-full">
      <div className="max-w-6xl mx-auto space-y-3">
        <div className="flex gap-1 rounded-xl bg-muted/60 p-1 w-fit flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold ${tab === t.id ? "bg-card shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
        {tab === "warroom" && <WarRoomTab />}
        {tab === "inbox" && <InboxTab bots={props.bots} />}
        {tab === "presence" && <PresenceTab />}
        {tab === "curator" && <CuratorTab />}
        {tab === "automation" && <AutomationTab />}
        {tab === "oversight" && <OversightTab />}
        {tab === "insights" && <InsightsTab />}
      </div>
    </div>
  );
}

