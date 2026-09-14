"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  WorkspaceBody,
  WorkspaceContainer,
  WorkspaceHeader,
} from "@/components/workspace/workspace-container";
import {
  useBots,
  useBotTemplates,
  useCloneBot,
  useEnsureBot,
  useFleetHealth,
  useKillSwitch,
  usePauseBot,
  useResumeBot,
  useSetKillSwitch,
  useUpdateBot,
} from "@/core/bots";
import { getBackendBaseURL } from "@/core/config";
import {
  useCancelGroupRun,
  useCreateRoom,
  useGroupRoom,
  useGroupRooms,
  useGroupRun,
  useGroupRuns,
  usePostRoomMessage,
  useStartGroupRun,
} from "@/core/groups";
import type { OrchestrationMode } from "@/core/groups";

const MODES: OrchestrationMode[] = [
  "mention",
  "moderated",
  "quorum",
  "parallel",
  "round_robin",
];

const BOT_STATUSES = ["active", "sleeping", "suspended", "archived"] as const;

export default function TeamPage() {
  const { bots, isLoading: botsLoading } = useBots();
  const { templates } = useBotTemplates();
  const { health: fleetHealth } = useFleetHealth();
  const { status: killSwitchStatus } = useKillSwitch();
  const setKillSwitch = useSetKillSwitch();
  const pauseBot = usePauseBot();
  const resumeBot = useResumeBot();

  const ensureBot = useEnsureBot();
  const cloneBot = useCloneBot();
  const updateBot = useUpdateBot();
  const { rooms, isLoading: roomsLoading } = useGroupRooms();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const { room: detail } = useGroupRoom(selectedRoom);
  const createRoom = useCreateRoom();
  const postMessage = usePostRoomMessage(selectedRoom ?? "");

  const [newBotName, setNewBotName] = useState("");
  const [newBotTemplate, setNewBotTemplate] = useState<string>("");
  const [teamGoal, setTeamGoal] = useState("");
  const [isGeneratingTeam, setIsGeneratingTeam] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomMode, setNewRoomMode] = useState<OrchestrationMode>("mention");
  const [draft, setDraft] = useState("");
  const [sender, setSender] = useState("user");
  const [objective, setObjective] = useState("");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const { runs } = useGroupRuns(selectedRoom);
  const { run: activeRun } = useGroupRun(selectedRoom, activeRunId);
  const startRun = useStartGroupRun(selectedRoom ?? "");
  const cancelRun = useCancelGroupRun(selectedRoom ?? "");

  const handleCreate = async () => {
    const name = newRoomName.trim();
    if (!name) return;
    const created = await createRoom.mutateAsync({ name, mode: newRoomMode });
    setSelectedRoom(created.name);
    setNewRoomName("");
  };

  const handlePost = async () => {
    if (!selectedRoom || !draft.trim()) return;
    await postMessage.mutateAsync({ sender: sender.trim() || "user", content: draft.trim() });
    setDraft("");
  };

  const handleStartRun = async () => {
    if (!selectedRoom || !objective.trim()) return;
    const run = await startRun.mutateAsync({ objective: objective.trim() });
    setActiveRunId(run.run_id);
    setObjective("");
  };

  const handleAddBot = async () => {
    const name = newBotName.trim().toLowerCase();
    if (!name) return;
    await ensureBot.mutateAsync({
      name,
      request: newBotTemplate ? { template: newBotTemplate } : {},
    });
    setNewBotName("");
    setNewBotTemplate("");
  };

  const handleGenerateTeam = async () => {
    if (!teamGoal.trim()) return;
    setIsGeneratingTeam(true);
    try {
      const res = await fetch(`${getBackendBaseURL()}/api/bots/generate-org`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: teamGoal.trim(), auto_provision: true }),
      });
      if (res.ok) {
        setTeamGoal("");
      }
    } finally {
      setIsGeneratingTeam(false);
    }
  };

  const handleCloneBot = async (source: string) => {
    const base = `${source}-copy`;
    let name = base;
    for (let i = 2; bots.some((b) => b.name === name); i += 1) {
      name = `${base}-${i}`;
    }
    await cloneBot.mutateAsync({ name, request: { source } });
  };

  const isKillSwitchActive = killSwitchStatus?.global_kill_switch_active;

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="w-full max-w-6xl space-y-3 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-xl font-semibold">AI Agent Fleet Command</h1>
              <p className="text-muted-foreground text-sm">
                Manage, monitor, auto-generate, and coordinate autonomous bots and team rooms
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isKillSwitchActive ? "destructive" : "outline"}
                className={`text-xs font-semibold ${isKillSwitchActive ? "animate-pulse" : ""}`}
                disabled={setKillSwitch.isPending}
                onClick={() =>
                  setKillSwitch.mutate({
                    active: !isKillSwitchActive,
                    reason: isKillSwitchActive ? "Operator resume" : "Operator emergency stop",
                  })
                }
              >
                {isKillSwitchActive ? "🚨 RESUME FLEET" : "🚨 EMERGENCY STOP"}
              </Button>
            </div>
          </div>

          {/* Fleet Health & Safety Status Banner */}
          {isKillSwitchActive && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-destructive text-xs font-semibold flex items-center justify-between">
              <span>🚨 GLOBAL KILL SWITCH ACTIVE — All autonomous bot operations and team runs are paused.</span>
            </div>
          )}

          {fleetHealth && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 rounded-md border p-2.5 bg-muted/30 text-xs">
              <div>
                <span className="text-muted-foreground">Fleet Health:</span>{" "}
                <span className="font-semibold text-emerald-600">
                  {Math.round(fleetHealth.fleet_health_score * 100)}%
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>{" "}
                <span className="font-semibold">{fleetHealth.summary.total}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Healthy:</span>{" "}
                <span className="font-semibold text-emerald-600">{fleetHealth.summary.healthy}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Sleeping:</span>{" "}
                <span className="font-semibold text-blue-600">{fleetHealth.summary.sleeping}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Stalled/Dead:</span>{" "}
                <span className={`font-semibold ${fleetHealth.summary.stalled + fleetHealth.summary.dead > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {fleetHealth.summary.stalled + fleetHealth.summary.dead}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid w-full max-w-6xl gap-6 p-4 lg:grid-cols-[300px_1fr]">
          <section className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">Bots ({bots.length})</h2>
              </div>
              {botsLoading ? (
                <p className="text-muted-foreground text-sm">Loading bots…</p>
              ) : (
                <ul className="space-y-2">
                  {bots.map((bot) => {
                    const isPaused = Boolean(killSwitchStatus?.paused_bots?.[bot.name]);
                    return (
                      <li key={bot.name} className="rounded-md border p-2.5 text-sm space-y-1">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span aria-hidden>{bot.avatar || "🤖"}</span>
                          <span className="min-w-0 flex-1 truncate">
                            {bot.display_name}{" "}
                            <span className="text-muted-foreground text-xs">@{bot.name}</span>
                          </span>
                          {isPaused ? (
                            <span className="bg-destructive/15 text-destructive rounded px-1 text-[10px] font-semibold">
                              Paused
                            </span>
                          ) : (
                            <span className="text-muted-foreground rounded border px-1 text-[10px]">
                              {bot.status}
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground text-xs flex items-center justify-between">
                          <span className="truncate">{bot.role}</span>
                          <span className="text-amber-600 font-semibold text-[10px]">
                            ★ {bot.reputation_score ?? 1.0}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-[11px] flex gap-2">
                          <span className="rounded bg-primary/10 text-primary px-1 text-[10px]">
                            {bot.department || "engineering"}
                          </span>
                          {bot.reports_to && (
                            <span className="truncate">reports to @{bot.reports_to}</span>
                          )}
                        </div>
                        <div className="mt-2 flex gap-1 pt-1">
                          <Select
                            value={bot.status}
                            onValueChange={(v) =>
                              updateBot.mutate({ name: bot.name, request: { status: v as (typeof BOT_STATUSES)[number] } })
                            }
                          >
                            <SelectTrigger className="h-7 text-xs flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BOT_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            disabled={cloneBot.isPending}
                            onClick={() => handleCloneBot(bot.name)}
                          >
                            Clone
                          </Button>
                          <Button
                            size="sm"
                            variant={isPaused ? "default" : "outline"}
                            className="h-7 text-xs px-2"
                            onClick={() => (isPaused ? resumeBot.mutate(bot.name) : pauseBot.mutate({ name: bot.name }))}
                          >
                            {isPaused ? "Resume" : "Pause"}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Add Bot Manually or by Template */}
              <div className="mt-3 space-y-2 rounded-md border p-2.5 bg-card">
                <div className="text-xs font-semibold">Quick Create Bot</div>
                <Input
                  placeholder="New bot name"
                  value={newBotName}
                  onChange={(e) => setNewBotName(e.target.value)}
                  className="h-8 text-xs"
                />
                <Select value={newBotTemplate} onValueChange={setNewBotTemplate}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Role template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.slug} value={t.slug} className="text-xs">
                        {t.avatar} {t.display} — {t.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full h-8 text-xs"
                  disabled={!newBotName.trim() || ensureBot.isPending}
                  onClick={handleAddBot}
                >
                  {ensureBot.isPending ? "Adding…" : "Add bot"}
                </Button>
              </div>

              {/* Auto-Generate Full Team from Goal */}
              <div className="mt-3 space-y-2 rounded-md border p-2.5 bg-card border-dashed">
                <div className="text-xs font-semibold flex items-center justify-between">
                  <span>Auto-Form Team from Goal</span>
                  <span className="text-[10px] text-muted-foreground">Dynamic Org</span>
                </div>
                <Input
                  placeholder="e.g. Build an autonomous SaaS analytics backend"
                  value={teamGoal}
                  onChange={(e) => setTeamGoal(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  variant="secondary"
                  className="w-full h-8 text-xs font-medium"
                  disabled={!teamGoal.trim() || isGeneratingTeam}
                  onClick={handleGenerateTeam}
                >
                  {isGeneratingTeam ? "Formulating Team…" : "Generate & Provision Team"}
                </Button>
              </div>
            </div>
            <div>
              <h2 className="mb-2 text-sm font-semibold">Rooms</h2>
              {roomsLoading ? (
                <p className="text-muted-foreground text-sm">Loading rooms…</p>
              ) : (
                <ul className="space-y-1">
                  {rooms.map((room) => (
                    <li key={room.room_id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRoom(room.name);
                          setActiveRunId(null);
                        }}
                        className={`w-full rounded-md border px-2 py-1.5 text-left text-sm ${
                          selectedRoom === room.name ? "bg-accent" : ""
                        }`}
                      >
                        <span className="font-medium">{room.name}</span>{" "}
                        <span className="text-muted-foreground text-xs">
                          {room.mode} · {room.members.length} members ·{" "}
                          {room.message_count} msgs
                        </span>
                      </button>
                    </li>
                  ))}
                  {rooms.length === 0 && (
                    <li className="text-muted-foreground text-sm">
                      No rooms yet — create one below.
                    </li>
                  )}
                </ul>
              )}
              <div className="mt-3 space-y-2 rounded-md border p-2">
                <Input
                  placeholder="New room name"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                />
                <Select
                  value={newRoomMode}
                  onValueChange={(v) => setNewRoomMode(v as OrchestrationMode)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  disabled={!newRoomName.trim() || createRoom.isPending}
                  onClick={handleCreate}
                >
                  {createRoom.isPending ? "Creating…" : "Create room"}
                </Button>
              </div>
            </div>
          </section>
          <section className="min-w-0">
            {!selectedRoom ? (
              <p className="text-muted-foreground text-sm">
                Select a room to read and post messages. Mention teammates with
                @handle — the room resolves next speakers per its orchestration
                mode.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="font-semibold">{detail?.name ?? selectedRoom}</span>{" "}
                  <span className="text-muted-foreground">
                    {detail?.topic} · mode {detail?.mode} · members{" "}
                    {(detail?.members ?? []).join(", ")}
                  </span>
                </div>
                <div className="max-h-[50vh] space-y-2 overflow-y-auto rounded-md border p-3">
                  {(detail?.messages ?? []).map((msg) => (
                    <div key={msg.id} className="text-sm">
                      <span className="font-medium">{msg.sender}</span>{" "}
                      <span className="text-muted-foreground text-xs">
                        {msg.intent} · {new Date(msg.created_at).toLocaleString()}
                      </span>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}
                  {(detail?.messages ?? []).length === 0 && (
                    <p className="text-muted-foreground text-sm">No messages yet.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    className="max-w-40"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    placeholder="sender"
                  />
                  <Textarea
                    className="min-h-10"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Message the room… try @coder"
                  />
                  <Button
                    disabled={!draft.trim() || postMessage.isPending}
                    onClick={handlePost}
                  >
                    {postMessage.isPending ? "Sending…" : "Send"}
                  </Button>
                </div>
                {postMessage.data && (
                  <p className="text-muted-foreground text-xs">
                    Next speakers:{" "}
                    {(postMessage.data.next_speakers ?? []).join(", ") || "—"}
                  </p>
                )}
                {postMessage.isError && (
                  <p className="text-destructive text-xs">
                    Failed to send — the Gateway may be offline.
                  </p>
                )}
                <div className="space-y-2 rounded-md border p-3">
                  <h3 className="text-sm font-semibold">
                    Autonomous team run
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    One objective in — every member works it in parallel, then
                    the moderator merges everything into a final deliverable.
                    No further prompts needed.
                  </p>
                  <Textarea
                    className="min-h-16"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Objective for the whole team…"
                  />
                  <div className="flex gap-2">
                    <Button
                      disabled={!objective.trim() || startRun.isPending}
                      onClick={handleStartRun}
                    >
                      {startRun.isPending ? "Starting…" : "Run team"}
                    </Button>
                    {activeRun?.status === "running" && (
                      <Button
                        variant="outline"
                        disabled={cancelRun.isPending}
                        onClick={() => cancelRun.mutate(activeRunId!)}
                      >
                        Cancel run
                      </Button>
                    )}
                  </div>
                  {startRun.isError && (
                    <p className="text-destructive text-xs">
                      Failed to start — is a model configured?
                    </p>
                  )}
                  {runs.length > 0 && (
                    <ul className="space-y-1">
                      {runs.slice(0, 5).map((run) => (
                        <li key={run.run_id}>
                          <button
                            type="button"
                            onClick={() => setActiveRunId(run.run_id)}
                            className={`w-full rounded-md border px-2 py-1.5 text-left text-xs ${
                              activeRunId === run.run_id ? "bg-accent" : ""
                            }`}
                          >
                            <span className="font-medium">{run.status}</span>{" "}
                            <span className="text-muted-foreground">
                              {run.objective.slice(0, 80)} ·{" "}
                              {Object.keys(run.member_results).length}/
                              {run.members.length} members
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {activeRun?.synthesis && (
                    <div className="rounded-md bg-muted p-2 text-sm whitespace-pre-wrap">
                      {activeRun.synthesis}
                    </div>
                  )}
                  {activeRun?.error && (
                    <p className="text-destructive text-xs">{activeRun.error}</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
