"use client";

import React, { useEffect, useState } from "react";
import { listProjects, createProject, updateProject, archiveProject, restoreProject, deleteProject, projectThreads, Project } from "@/lib/projects";
import { moveThread } from "@/lib/threads-ext";
import { Section, EmptyState, ErrorBox, Notice, Btn, Badge, Field, SkeletonList, inputCls } from "@/components/ui";
import { errMsg } from "@/lib/http";
import { Plus, Archive, ArchiveRestore, Trash2, RefreshCw, Pencil } from "lucide-react";

export function ProjectsSection(props: { onOpenThread: (id: string) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, Array<{ thread_id: string; display_name: string }>>>({});
  const [editing, setEditing] = useState<{ id: string; instructions: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await listProjects());
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (m: string) => {
    setNotice(m);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const toggle = async (p: Project) => {
    const isOpen = open === p.id;
    setOpen(isOpen ? null : p.id);
    if (!isOpen && !threads[p.id]) {
      try {
        const list = await projectThreads(p.id);
        setThreads((prev) => ({ ...prev, [p.id]: list }));
      } catch (e) {
        setError(errMsg(e));
      }
    }
  };

  const act = async (fn: () => Promise<void>, ok: string) => {
    try {
      await fn();
      flash(ok);
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <Section
      title="Projects"
      hint="Group related conversations — one project per client, topic or goal. Give a project instructions and every chat inside follows them."
      actions={
        <Btn variant="ghost" onClick={load}>
          <RefreshCw className="size-3.5" /> Refresh
        </Btn>
      }
    >
      {error && <ErrorBox message={error} onRetry={load} />}
      {notice && <Notice message={notice} />}

      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <Field label="New project" hint="Example: Website redesign, Q4 planning, Customer support.">
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && act(() => createProject(name.trim()).then(() => undefined), "Project created.")} placeholder="Project name…" className={inputCls} aria-label="New project name" />
            <Btn onClick={() => name.trim() && act(() => createProject(name.trim()).then(() => { setName(""); }), "Project created.")} disabled={!name.trim()}>
              <Plus className="size-3.5" /> Create
            </Btn>
          </div>
        </Field>
      </div>

      {loading ? (
        <SkeletonList rows={4} />
      ) : projects.length === 0 ? (
        <EmptyState title="No projects yet" hint="Create one above, then move conversations into it from the chat sidebar." />
      ) : (
        <div className="space-y-2">
          {projects.map((p) => (
            <div key={p.id} className="rounded-xl border border-border/60 bg-card">
              <div className="flex items-center gap-2 px-4 py-3 cursor-pointer" onClick={() => toggle(p)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && toggle(p)}>
                <p className="text-sm font-semibold flex-1">{p.name}</p>
                <Badge tone={p.status === "archived" ? "gray" : "green"}>{p.status}</Badge>
                <span className="text-[11px] text-muted-foreground">{open === p.id ? "Hide" : "Show"}</span>
              </div>
              {open === p.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                  {editing?.id === p.id ? (
                    <div className="space-y-2">
                      <Field label="Project instructions" hint="The agent follows these in every conversation inside this project.">
                        <textarea value={editing.instructions} onChange={(e) => setEditing({ id: p.id, instructions: e.target.value })} rows={3} className={inputCls} />
                      </Field>
                      <div className="flex gap-2">
                        <Btn onClick={() => act(() => updateProject(p.id, { instructions: editing.instructions }).then(() => setEditing(null)), "Instructions saved.")}>Save</Btn>
                        <Btn variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <p className="text-xs text-muted-foreground flex-1 whitespace-pre-wrap">{p.instructions || "No instructions yet."}</p>
                      <Btn variant="ghost" onClick={() => setEditing({ id: p.id, instructions: p.instructions })}>
                        <Pencil className="size-3.5" /> Edit
                      </Btn>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-semibold mb-1.5">Conversations ({(threads[p.id] || []).length})</p>
                    {(threads[p.id] || []).length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">Empty — move a chat here from the sidebar menu.</p>
                    ) : (
                      <div className="space-y-1">
                        {(threads[p.id] || []).map((t) => (
                          <div key={t.thread_id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
                            <button type="button" onClick={() => props.onOpenThread(t.thread_id)} className="text-[11px] font-medium flex-1 text-left truncate hover:text-primary">
                              {t.display_name}
                            </button>
                            <button type="button" onClick={() => act(() => moveThread(t.thread_id, null), "Moved out of project.").then(() => setThreads((prev) => ({ ...prev, [p.id]: (prev[p.id] || []).filter((x) => x.thread_id !== t.thread_id) })))} className="text-[11px] text-muted-foreground hover:text-destructive" title="Remove from project">
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {p.status === "archived" ? (
                      <Btn variant="ghost" onClick={() => act(() => restoreProject(p.id), "Restored.")}>
                        <ArchiveRestore className="size-3.5" /> Restore
                      </Btn>
                    ) : (
                      <Btn variant="ghost" onClick={() => act(() => archiveProject(p.id), "Archived.")}>
                        <Archive className="size-3.5" /> Archive
                      </Btn>
                    )}
                    <Btn variant="danger" onClick={() => window.confirm(`Delete project "${p.name}"? Chats inside are kept.`) && act(() => deleteProject(p.id), "Deleted.")}>
                      <Trash2 className="size-3.5" /> Delete
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
