"use client";

import React, { useState } from "react";
import { fetchMe, login, register, logout, changePassword, listPats, createPat, deletePat, UserInfo } from "@/lib/auth";
import { Section, ErrorBox, Notice, Btn, Field, Badge, SkeletonList, inputCls } from "@/components/ui";
import { errMsg } from "@/lib/http";
import { LogIn, LogOut, KeyRound, Trash2, UserPlus, RefreshCw } from "lucide-react";

export function AuthSection(props: { user: UserInfo | null; loading: boolean; onChanged: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pats, setPats] = useState<Array<{ id: string; name: string; created_at: string }>>([]);
  const [patsLoading, setPatsLoading] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [patName, setPatName] = useState("");
  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");

  const flash = (m: string) => {
    setNotice(m);
    window.setTimeout(() => setNotice(null), 5000);
  };

  const submit = async () => {
    if (!username.trim() || !password) {
      setError("Enter both username and password.");
      return;
    }
    setError(null);
    try {
      if (mode === "login") await login(username.trim(), password);
      else await register(username.trim(), password);
      setPassword("");
      props.onChanged();
      flash(mode === "login" ? "Signed in." : "Account created and signed in.");
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const loadPats = async () => {
    setPatsLoading(true);
    try {
      setPats(await listPats());
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setPatsLoading(false);
    }
  };

  const onCreatePat = async () => {
    if (!patName.trim()) {
      setError("Name the token first, e.g. “my laptop”.");
      return;
    }
    try {
      const token = await createPat(patName.trim());
      setNewToken(token);
      setPatName("");
      await loadPats();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (props.loading) {
    return (
      <Section title="Account" hint="Sign in and API tokens.">
        <SkeletonList rows={3} />
      </Section>
    );
  }

  if (!props.user) {
    return (
      <Section
        title="Account"
        hint="Sign in to unlock personal memory, saved chats and admin actions. If this is a private home server, the admin account may already exist — try signing in."
      >
        {error && <ErrorBox message={error} />}
        {notice && <Notice message={notice} />}
        <div className="rounded-2xl border border-border/60 bg-card p-5 max-w-md space-y-3">
          <div className="flex gap-1 rounded-xl bg-muted/60 p-1 w-fit">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold ${mode === m ? "bg-card shadow" : "text-muted-foreground"}`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
          <Field label="Username">
            <input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="you" autoComplete="username" className={inputCls} />
          </Field>
          <Field label="Password">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} className={inputCls} />
          </Field>
          <Btn onClick={submit}>
            {mode === "login" ? <LogIn className="size-3.5" /> : <UserPlus className="size-3.5" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </Btn>
          <p className="text-[11px] text-muted-foreground">Tip: if sign-in fails with 401/404, the server may run without accounts (auth disabled) — everything already works.</p>
        </div>
      </Section>
    );
  }

  return (
    <Section
      title="Account"
      hint="You are signed in. Manage your password and tokens for scripts and apps."
      actions={
        <Btn variant="ghost" onClick={() => logout().then(props.onChanged).catch((e) => setError(errMsg(e)))}>
          <LogOut className="size-3.5" /> Sign out
        </Btn>
      }
    >
      {error && <ErrorBox message={error} />}
      {notice && <Notice message={notice} />}

      <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card p-4">
        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
          {props.user.username.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{props.user.username}</p>
          <p className="text-[11px] text-muted-foreground font-mono">{props.user.id}</p>
        </div>
        {props.user.isAdmin && <Badge tone="blue">admin</Badge>}
        <button type="button" onClick={() => fetchMe().then(() => props.onChanged())} className="p-2 rounded-lg hover:bg-muted text-muted-foreground" title="Refresh">
          <RefreshCw className="size-4" />
        </button>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2.5">
        <p className="text-xs font-semibold">Change password</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="Current password">
            <input type="password" value={pwOld} onChange={(e) => setPwOld(e.target.value)} autoComplete="current-password" className={inputCls} />
          </Field>
          <Field label="New password">
            <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} autoComplete="new-password" className={inputCls} />
          </Field>
        </div>
        <Btn
          variant="ghost"
          onClick={() => changePassword(pwOld, pwNew).then(() => { setPwOld(""); setPwNew(""); flash("Password changed."); }).catch((e) => setError(errMsg(e)))}
          disabled={!pwOld || !pwNew}
        >
          Update password
        </Btn>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" />
          <p className="text-xs font-semibold flex-1">API tokens (for scripts & apps)</p>
          <Btn variant="ghost" onClick={loadPats}>Load</Btn>
        </div>
        <p className="text-[11px] text-muted-foreground">Tokens start with <code className="font-mono">dfp_…</code> and act as you, limited to chats and runs.</p>
        <div className="flex gap-2">
          <input value={patName} onChange={(e) => setPatName(e.target.value)} placeholder="Token name, e.g. my laptop…" className={inputCls} aria-label="New token name" />
          <Btn onClick={onCreatePat} disabled={!patName.trim()}>Create</Btn>
        </div>
        {newToken && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
            <p className="text-[11px] font-semibold">Copy now — it won't be shown again:</p>
            <p className="text-[11px] font-mono break-all mt-1">{newToken}</p>
          </div>
        )}
        {patsLoading ? (
          <SkeletonList rows={2} />
        ) : (
          pats.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
              <span className="text-xs font-medium flex-1 truncate">{p.name}</span>
              <button type="button" onClick={() => window.confirm(`Delete token "${p.name}"?`) && deletePat(p.id).then(loadPats).catch((e) => setError(errMsg(e)))} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive" title="Delete token">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </Section>
  );
}
