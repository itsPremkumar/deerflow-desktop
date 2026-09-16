"use client";

import React, { useEffect, useState } from "react";
import { EmptyState, ErrorBox, Btn, Badge, Field, inputCls } from "@/components/ui";
import { errMsg } from "@/lib/http";
import { listProjects } from "@/lib/projects";
import {
  fetchInbox, sendDM, ackDM, fetchPresence, fetchProjectState, fetchSkillUsage,
  fetchCuratorReport, runCurator, fetchBlueprints, launchBlueprint, fetchBenchmarkSuites,
  runBenchmarkSuite, fetchConsoleInsights, fetchOpsAdvice, listCouncilCases, fetchPendingApprovals,
  decideApproval, localEndpointHealth, type PresenceMember, type ProjectStateSnapshot,
} from "@/lib/workforce";
import { RefreshCw, Send, Inbox, Users, Wrench, CalendarClock, Scale, Activity } from "lucide-react";

export interface WorkforceBot {
  name: string;
  display_name: string;
}

type TabId = "inbox" | "presence" | "curator" | "automation" | "oversight" | "insights";

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
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

export function WorkforceSection(props: { bots: WorkforceBot[] }) {
  const [tab, setTab] = useState<TabId>("inbox");
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
