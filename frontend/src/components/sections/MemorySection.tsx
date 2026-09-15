"use client";

import React, { useEffect, useState } from "react";
import { fetchMemory, addFact, deleteFact, updateFact, reloadMemory, clearMemory, memoryStatus, MemoryFact } from "@/lib/memory";
import { Section, EmptyState, ErrorBox, Notice, Btn, Field, SkeletonList, inputCls, Badge } from "@/components/ui";
import { errMsg } from "@/lib/http";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

export function MemorySection() {
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mem, st] = await Promise.all([fetchMemory(), memoryStatus()]);
      setFacts(mem.facts);
      setSummary(mem.summary);
      setStatus(st);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const onAdd = async () => {
    if (!draft.trim()) return;
    try {
      await addFact(draft.trim());
      setDraft("");
      flash("Saved — the agent will remember this.");
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Forget this? The agent will no longer know it.")) return;
    try {
      await deleteFact(id);
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const onSaveEdit = async () => {
    if (!editing || !editing.text.trim()) return;
    try {
      await updateFact(editing.id, editing.text.trim());
      setEditing(null);
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const onClear = async () => {
    if (!window.confirm("Erase ALL memory? This cannot be undone.")) return;
    try {
      await clearMemory();
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <Section
      title="Memory"
      hint="Everything the agent remembers about you — preferences, projects, facts. Add, fix or remove entries; the agent reads these every conversation."
      actions={
        <>
          <Btn variant="ghost" onClick={() => reloadMemory().then(load).catch((e) => setError(errMsg(e)))}>
            <RefreshCw className="size-3.5" /> Reload
          </Btn>
          <Btn variant="danger" onClick={onClear}>
            <Trash2 className="size-3.5" /> Erase all
          </Btn>
        </>
      }
    >
      {error && <ErrorBox message={error} onRetry={load} />}
      {notice && <Notice message={notice} />}
      {status && (
        <div className="flex gap-2 flex-wrap text-[11px] text-muted-foreground">
          <Badge tone="blue">{facts.length} facts</Badge>
          {typeof status.enabled !== "undefined" && (
            <Badge tone={status.enabled ? "green" : "gray"}>memory {status.enabled ? "on" : "off"}</Badge>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
        <Field label="Teach the agent something new" hint='Example: "I prefer TypeScript over JavaScript" or "My company sells solar panels".'>
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAdd()}
              placeholder="Type a fact to remember…"
              className={inputCls}
              aria-label="New memory fact"
            />
            <Btn onClick={onAdd} disabled={!draft.trim()}>
              <Plus className="size-3.5" /> Remember
            </Btn>
          </div>
        </Field>
      </div>

      {summary && (
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-[11px] font-semibold mb-1">Summary</p>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{summary}</p>
        </div>
      )}

      {loading ? (
        <SkeletonList rows={4} />
      ) : facts.length === 0 ? (
        <EmptyState title="No memories yet" hint="The agent learns as you chat. You can also teach it something using the box above." />
      ) : (
        <div className="space-y-2">
          {facts.map((f) => (
            <div key={f.id} className="rounded-xl border border-border/60 bg-card px-4 py-2.5 flex items-center gap-2">
              {editing?.id === f.id ? (
                <>
                  <input
                    value={editing.text}
                    onChange={(e) => setEditing({ id: editing.id, text: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onSaveEdit();
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className={inputCls}
                    autoFocus
                    aria-label="Edit memory fact"
                  />
                  <Btn onClick={onSaveEdit}>Save</Btn>
                  <Btn variant="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </Btn>
                </>
              ) : (
                <>
                  <p className="text-xs flex-1">{f.content}</p>
                  <button
                    type="button"
                    onClick={() => setEditing({ id: f.id, text: f.content })}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Edit"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(f.id)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive"
                    title="Forget"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
