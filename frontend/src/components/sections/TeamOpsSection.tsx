"use client";

import React, { useEffect, useState } from "react";
import { listGroups, createGroup, postGroupMessage, groupMessages, startGroupRun, listSwarms, createSwarm, swarmAction, listMcpTasks, listJobs, cancelJob, companyStatus, executiveDigest, companyKpis } from "@/lib/teamops";
import { Section, EmptyState, ErrorBox, Notice, Btn, Badge, Field, SkeletonList, inputCls } from "@/components/ui";
import { errMsg } from "@/lib/http";
import { Plus, Send, Play, RefreshCw, Ban } from "lucide-react";

type SubTab = "groups" | "swarms" | "jobs" | "company";

export function TeamOpsSection(props: { threadId: string | null; mcpTasksAvailable: boolean }) {
  const [tab, setTab] = useState<SubTab>("groups");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [groups, setGroups] = useState<Array<{ name: string; members: string[]; status: string }>>([]);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState("");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [groupMsgs, setGroupMsgs] = useState<Record<string, Array<Record<string, unknown>>>>({});
  const [groupDraft, setGroupDraft] = useState("");
  const [groupObjective, setGroupObjective] = useState("");

  const [swarms, setSwarms] = useState<Array<{ id: string; objective: string; status: string }>>([]);
  const [swarmObjective, setSwarmObjective] = useState("");
  const [jobs, setJobs] = useState<Array<{ id: string; kind: string; status: string }>>([]);
  const [mcpTasks, setMcpTasks] = useState<Array<Record<string, unknown>>>([]);
  const [digest, setDigest] = useState("");
  const [kpis, setKpis] = useState<Array<Record<string, unknown>>>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, s, j] = await Promise.all([listGroups(), listSwarms(), listJobs()]);
      setGroups(g);
      setSwarms(s);
      setJobs(j);
      if (props.threadId && props.mcpTasksAvailable) {
        setMcpTasks(await listMcpTasks(props.threadId));
      }
      const [d, k] = await Promise.all([executiveDigest(), companyKpis()]);
      setDigest(d);
      setKpis(k);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = (m: string) => {
    setNotice(m);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const act = async (fn: () => Promise<void>, ok?: string) => {
    try {
      await fn();
      if (ok) flash(ok);
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const openMessages = async (name: string) => {
    const isOpen = openGroup === name;
    setOpenGroup(isOpen ? null : name);
    if (!isOpen && !groupMsgs[name]) {
      try {
        const ms = await groupMessages(name);
        setGroupMsgs((prev) => ({ ...prev, [name]: ms }));
      } catch (e) {
        setError(errMsg(e));
      }
    }
  };

  const tabs: Array<{ id: SubTab; label: string }> = [
    { id: "groups", label: `Group chats (${groups.length})` },
    { id: "swarms", label: `Swarms (${swarms.length})` },
    { id: "jobs", label: `Jobs (${jobs.length})` },
    { id: "company", label: "Company" },
  ];

  return (
    <Section
      title="Team ops"
      hint="Several agents working together: group chats with turn-taking, swarms for parallel jobs, background jobs, and the autonomous-company briefing."
      actions={
        <Btn variant="ghost" onClick={load}>
          <RefreshCw className="size-3.5" /> Refresh
        </Btn>
      }
    >
      {error && <ErrorBox message={error} onRetry={load} />}
      {notice && <Notice message={notice} />}

      <div className="flex gap-1 flex-wrap rounded-xl bg-muted/60 p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold ${tab === t.id ? "bg-card shadow" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList rows={4} />
      ) : tab === "groups" ? (
        <div className="space-y-2">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <Field label="New group room" hint="Comma-separated member bot names, e.g. researcher, reviewer.">
              <div className="flex flex-col sm:flex-row gap-2">
                <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Room name…" className={inputCls} aria-label="Group room name" />
                <input value={groupMembers} onChange={(e) => setGroupMembers(e.target.value)} placeholder="researcher, reviewer" className={inputCls} aria-label="Group members" />
                <Btn onClick={() => groupName.trim() && act(() => createGroup(groupName.trim(), groupMembers.split(",").map((m) => m.trim()).filter(Boolean)).then(() => { setGroupName(""); setGroupMembers(""); }), "Room created.")} disabled={!groupName.trim()}>
                  <Plus className="size-3.5" /> Create
                </Btn>
              </div>
            </Field>
          </div>
          {groups.length === 0 ? (
            <EmptyState title="No group rooms" hint="Create one above to let several bots discuss with turn-taking." />
          ) : (
            groups.map((g) => (
              <div key={g.name} className="rounded-xl border border-border/60 bg-card">
                <div className="flex items-center gap-2 px-4 py-3 cursor-pointer" onClick={() => openMessages(g.name)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && openMessages(g.name)}>
                  <p className="text-sm font-semibold flex-1">{g.name}</p>
                  <span className="text-[11px] text-muted-foreground">{g.members.length} members</span>
                  {g.status && <Badge tone="gray">{g.status}</Badge>}
                </div>
                {openGroup === g.name && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-2">
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {(groupMsgs[g.name] || []).length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">No messages yet — say hello below.</p>
                      ) : (
                        (groupMsgs[g.name] || []).slice(-20).map((m, i) => (
                          <div key={i} className="text-[11px] rounded-lg bg-muted/40 px-2.5 py-1.5">
                            <span className="font-semibold">{String(m.author ?? m.bot ?? m.role ?? "bot")}: </span>
                            {String(m.content ?? m.text ?? JSON.stringify(m)).slice(0, 500)}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input value={groupDraft} onChange={(e) => setGroupDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && groupDraft.trim() && act(() => postGroupMessage(g.name, groupDraft.trim()).then(() => setGroupDraft("")).then(() => groupMessages(g.name)).then((ms) => setGroupMsgs((p) => ({ ...p, [g.name]: ms }))))} placeholder="Message the room…" className={inputCls} aria-label={`Message ${g.name}`} />
                      <Btn onClick={() => groupDraft.trim() && act(() => postGroupMessage(g.name, groupDraft.trim()).then(() => setGroupDraft("")).then(() => groupMessages(g.name)).then((ms) => setGroupMsgs((p) => ({ ...p, [g.name]: ms }))))}>
                        <Send className="size-3.5" />
                      </Btn>
                    </div>
                    <div className="flex gap-2">
                      <input value={groupObjective} onChange={(e) => setGroupObjective(e.target.value)} placeholder="Autonomous goal, e.g. Draft the launch plan…" className={inputCls} aria-label="Autonomous run objective" />
                      <Btn variant="ghost" onClick={() => groupObjective.trim() && act(() => startGroupRun(g.name, groupObjective.trim()).then(() => setGroupObjective("")), "Autonomous run started.")} disabled={!groupObjective.trim()}>
                        <Play className="size-3.5" /> Auto-run
                      </Btn>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : tab === "swarms" ? (
        <div className="space-y-2">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <Field label="Launch a swarm" hint="Many workers in parallel on one objective.">
              <div className="flex gap-2">
                <input value={swarmObjective} onChange={(e) => setSwarmObjective(e.target.value)} onKeyDown={(e) => e.key === "Enter" && swarmObjective.trim() && act(() => createSwarm(swarmObjective.trim()).then(() => setSwarmObjective("")), "Swarm launched.")} placeholder="Objective…" className={inputCls} />
                <Btn onClick={() => swarmObjective.trim() && act(() => createSwarm(swarmObjective.trim()).then(() => setSwarmObjective("")), "Swarm launched.")} disabled={!swarmObjective.trim()}>
                  <Play className="size-3.5" /> Launch
                </Btn>
              </div>
            </Field>
          </div>
          {swarms.length === 0 ? (
            <EmptyState title="No swarms" hint="Launch one above for parallel teamwork." />
          ) : (
            swarms.map((s) => (
              <div key={s.id} className="rounded-xl border border-border/60 bg-card px-4 py-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-mono flex-1 min-w-32 break-all">{s.id.slice(0, 24)}</p>
                  <Badge tone={s.status === "running" ? "blue" : "gray"}>{s.status}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{s.objective}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {(["step", "pause", "resume", "cancel"] as const).map((a) => (
                    <Btn key={a} variant="ghost" onClick={() => act(() => swarmAction(s.id, a))}>
                      {a[0].toUpperCase() + a.slice(1)}
                    </Btn>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === "jobs" ? (
        <div className="space-y-2">
          {props.mcpTasksAvailable && (
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <p className="text-xs font-semibold mb-1.5">Long-running tool tasks in this chat ({mcpTasks.length})</p>
              {mcpTasks.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">None — durable tool work appears here.</p>
              ) : (
                mcpTasks.slice(0, 10).map((t, i) => (
                  <p key={i} className="text-[11px] font-mono rounded-lg bg-muted/40 px-2.5 py-1.5 mb-1 break-all">
                    {String(t.task_id ?? t.id ?? JSON.stringify(t)).slice(0, 200)}
                  </p>
                ))
              )}
            </div>
          )}
          {jobs.length === 0 ? (
            <EmptyState title="No background jobs" hint="Jobs are created by the server for long operations." />
          ) : (
            jobs.map((j) => (
              <div key={j.id} className="rounded-xl border border-border/60 bg-card px-4 py-2.5 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono truncate">{j.id}</p>
                  <p className="text-[11px] text-muted-foreground">{j.kind}</p>
                </div>
                <Badge tone={j.status === "running" ? "blue" : "gray"}>{j.status}</Badge>
                <Btn variant="danger" onClick={() => window.confirm("Cancel this job?") && act(() => cancelJob(j.id), "Cancelled.")}>
                  <Ban className="size-3.5" />
                </Btn>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <CompanyDigest digest={digest} />
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-xs font-semibold mb-2">Key figures ({kpis.length})</p>
            {kpis.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No KPIs reported.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {kpis.slice(0, 12).map((k, i) => (
                  <div key={i} className="rounded-xl bg-muted/40 p-2.5">
                    <p className="text-sm font-bold">{String(k.value ?? k.current ?? "—")}</p>
                    <p className="text-[10px] text-muted-foreground">{String(k.name ?? k.label ?? k.metric ?? `KPI ${i + 1}`)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <CompanyStatusBox />
        </div>
      )}
    </Section>
  );
}

function CompanyDigest(props: { digest: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-xs font-semibold mb-1.5">Executive briefing</p>
      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{props.digest || "No briefing available."}</p>
    </div>
  );
}

function CompanyStatusBox() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    companyStatus().then(setStatus).catch(() => setStatus(null));
  }, []);
  if (!status) return null;
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-xs font-semibold mb-2">Company status</p>
      <pre className="text-[11px] font-mono whitespace-pre-wrap max-h-56 overflow-y-auto rounded-xl bg-muted/40 p-3">{JSON.stringify(status, null, 2).slice(0, 3000)}</pre>
    </div>
  );
}
