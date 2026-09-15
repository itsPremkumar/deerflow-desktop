"use client";

import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { ThreadSidebar } from "@/components/ThreadSidebar";
import { MessageItem } from "@/components/MessageItem";
import { Composer } from "@/components/Composer";
import { NavTabs, WorkspaceView } from "@/components/NavTabs";
import { ChatMessage, Thread, AIModel } from "@/types/chat";
import { BotProfile } from "@/types/bots";
import { fetchThreads, createThread, fetchThreadHistory, fetchAvailableModels, autoTriggerCommand } from "@/lib/api";
import { fetchBots, touchBot } from "@/lib/bots";
import { fetchFeatures, fetchOpsStatus, FeatureFlags } from "@/lib/workspace";
import { fetchMe, UserInfo } from "@/lib/auth";
import { listThreadRuns, cancelRun } from "@/lib/runs";
import { rateMessage } from "@/lib/feedback";
import { suggestionsEnabled, suggestFollowUps, polishDraft } from "@/lib/assist";
import { listCommands, executeCommand, SlashCommand } from "@/lib/commands";
import {
  loadStore,
  upsertLocalThread,
  remapThreadId,
  appendLocalMessages,
  setLocalMessages,
  updateLocalMessage,
  removeLocalThread,
  setThreadMeta,
  searchLocalMessages,
  storageInfo,
  exportStoreJson,
  importStoreJson,
} from "@/lib/history-store";
import { uploadFiles } from "@/lib/files";
import { fetchGoal, setGoal, clearGoal, compactThread, fetchTokenUsage, TokenUsage } from "@/lib/threads-ext";
import { BotGallery } from "@/components/bots/BotGallery";
import { BotDetailPanel } from "@/components/bots/BotDetailPanel";
import { ActiveBotPicker } from "@/components/bots/ActiveBotPicker";
import { SkeletonList } from "@/components/ui";
import { Sparkles, Activity, Shrink, Target, X, ClipboardList } from "lucide-react";

// Sections load on demand so the first paint stays light.
const BotOpsSection = lazy(() => import("@/components/sections/BotOpsSection").then((m) => ({ default: m.BotOpsSection })));
const MessagesSection = lazy(() => import("@/components/sections/MessagesSection").then((m) => ({ default: m.MessagesSection })));
const KanbanSection = lazy(() => import("@/components/sections/KanbanSection").then((m) => ({ default: m.KanbanSection })));
const RunsSection = lazy(() => import("@/components/sections/RunsSection").then((m) => ({ default: m.RunsSection })));
const FilesSection = lazy(() => import("@/components/sections/FilesSection").then((m) => ({ default: m.FilesSection })));
const ScheduledSection = lazy(() => import("@/components/sections/ScheduledSection").then((m) => ({ default: m.ScheduledSection })));
const SubagentsSection = lazy(() => import("@/components/sections/SubagentsSection").then((m) => ({ default: m.SubagentsSection })));
const SkillsSection = lazy(() => import("@/components/sections/SkillsSection").then((m) => ({ default: m.SkillsSection })));
const MemorySection = lazy(() => import("@/components/sections/MemorySection").then((m) => ({ default: m.MemorySection })));
const ProjectsSection = lazy(() => import("@/components/sections/ProjectsSection").then((m) => ({ default: m.ProjectsSection })));
const DashboardSection = lazy(() => import("@/components/sections/DashboardSection").then((m) => ({ default: m.DashboardSection })));
const AgentsSection = lazy(() => import("@/components/sections/AgentsSection").then((m) => ({ default: m.AgentsSection })));
const TeamOpsSection = lazy(() => import("@/components/sections/TeamOpsSection").then((m) => ({ default: m.TeamOpsSection })));
const ChannelsSection = lazy(() => import("@/components/sections/ChannelsSection").then((m) => ({ default: m.ChannelsSection })));
const SystemSection = lazy(() => import("@/components/sections/SystemSection").then((m) => ({ default: m.SystemSection })));
const AuthSection = lazy(() => import("@/components/sections/AuthSection").then((m) => ({ default: m.AuthSection })));

function SectionFallback() {
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 w-full">
      <div className="max-w-6xl mx-auto">
        <SkeletonList rows={4} />
      </div>
    </div>
  );
}

export default function ChatView() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("default");
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Multi-bot-profile state
  const [bots, setBots] = useState<BotProfile[]>([]);
  const [botsLoading, setBotsLoading] = useState<boolean>(true);
  const [activeBot, setActiveBot] = useState<BotProfile | null>(null);
  const [view, setView] = useState<WorkspaceView>("chat");
  const [botsTab, setBotsTab] = useState<"profiles" | "ops">("profiles");
  const [inspectedBot, setInspectedBot] = useState<BotProfile | null>(null);

  // Platform state
  const [features, setFeatures] = useState<FeatureFlags>({ agentsApi: false, browserControl: false, mcpTasks: false, subagentBatches: false });
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [guestDismissed, setGuestDismissed] = useState(false);

  // Conversation helpers
  const [goal, setGoalText] = useState<string | null>(null);
  const [goalEditing, setGoalEditing] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  const [usage, setUsage] = useState<TokenUsage | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsOn, setSuggestionsOn] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [planMode, setPlanMode] = useState(false);
  const [slashCommands, setSlashCommands] = useState<SlashCommand[]>([]);
  const [gatewayOk, setGatewayOk] = useState<boolean | null>(null);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4500);
  };

  // Initial load: local history first (instant), then merge the server.
  useEffect(() => {
    async function init() {
      try {
        const local = loadStore();
        if (local.threads.length > 0) {
          const sorted = [...local.threads].sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
          setThreads(sorted);
          setActiveThreadId(sorted[0].thread_id);
        }
      } catch {
        /* fresh start */
      }
      const [tList, mList, bList, feats, me, suggOn] = await Promise.all([
        fetchThreads(),
        fetchAvailableModels(),
        fetchBots(),
        fetchFeatures(),
        fetchMe(),
        suggestionsEnabled(),
      ]);
      const merged = mergeThreads(tList);
      setThreads(merged);
      setModels(mList);
      if (mList.length > 0) setSelectedModel(mList[0].id);
      setActiveThreadId((prev) => prev || (merged.length > 0 ? merged[0].thread_id : null));
      setBots(bList);
      setBotsLoading(false);
      setFeatures(feats);
      setUser(me);
      setUserLoading(false);
      setSuggestionsOn(suggOn);
      // Lightweight liveness probe for the header status pill.
      fetchOpsStatus().then(() => setGatewayOk(true)).catch(() => setGatewayOk(false));
      // Shortcut commands for the "/" palette (quiet if unavailable).
      listCommands().then(setSlashCommands).catch(() => setSlashCommands([]));
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshBots = async () => {
    setBotsLoading(true);
    const bList = await fetchBots();
    setBots(bList);
    setBotsLoading(false);
    if (activeBot) {
      const fresh = bList.find((b) => b.name === activeBot.name);
      if (fresh) setActiveBot(fresh);
    }
  };

  /** Union of server + locally stored threads (server wins metadata, local-only kept). */
  const mergeThreads = (serverList: Thread[]): Thread[] => {
    const store = loadStore();
    const byId = new Map<string, Thread>(store.threads.map((t) => [t.thread_id, t]));
    for (const st of serverList) {
      const local = byId.get(st.thread_id);
      byId.set(st.thread_id, local ? { ...local, ...st } : st);
      upsertLocalThread(byId.get(st.thread_id)!);
    }
    return Array.from(byId.values()).sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
  };

  const reloadThreads = async (selectId?: string) => {
    const tList = await fetchThreads();
    const merged = mergeThreads(tList);
    setThreads(merged);
    if (selectId) setActiveThreadId(selectId);
    else if (activeThreadId && !merged.some((t) => t.thread_id === activeThreadId)) {
      setActiveThreadId(merged.length > 0 ? merged[0].thread_id : null);
    }
  };

  // Fetch messages + goal + usage when thread changes (server first, local cache fallback).
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      setGoalText(null);
      setUsage(null);
      setSuggestions([]);
      return;
    }
    async function loadMessages() {
      const tid = activeThreadId!;
      const history = await fetchThreadHistory(tid);
      if (history.length > 0) {
        setMessages(history);
        try {
          setLocalMessages(tid, history);
        } catch {
          /* cache best-effort */
        }
      } else {
        try {
          setMessages(loadStore().messages[tid] || []);
        } catch {
          setMessages([]);
        }
      }
      try {
        const g = await fetchGoal(tid);
        if (g.goal) {
          setGoalText(g.goal);
          try {
            setThreadMeta(tid, { goal: g.goal });
          } catch {
            /* ignore */
          }
        } else {
          setGoalText(loadStore().meta[tid]?.goal || null);
        }
      } catch {
        try {
          setGoalText(loadStore().meta[tid]?.goal || null);
        } catch {
          setGoalText(null);
        }
      }
      try {
        setUsage(await fetchTokenUsage(tid));
      } catch {
        setUsage(null);
      }
      setSuggestions([]);
    }
    loadMessages();
  }, [activeThreadId]);

  // Restore this conversation's specialist bot once bots are known.
  useEffect(() => {
    if (!activeThreadId || bots.length === 0) return;
    try {
      const name = loadStore().meta[activeThreadId]?.botName || null;
      setActiveBot(name ? bots.find((b) => b.name === name) || null : null);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThreadId, bots]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, view]);

  const handleNewChat = async () => {
    // Local-first: the chat exists instantly, the server copy follows.
    const localId = `local-${Date.now()}`;
    const draft: Thread = {
      thread_id: localId,
      title: "New Conversation",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      botName: activeBot?.name ?? null,
    };
    try {
      upsertLocalThread(draft);
    } catch {
      /* ignore */
    }
    setThreads((prev) => [draft, ...prev]);
    setActiveThreadId(localId);
    setMessages([]);
    setView("chat");
    try {
      const serverId = await createThread("New Conversation", { botName: activeBot?.name ?? null });
      const serverThread: Thread = { ...draft, thread_id: serverId };
      try {
        remapThreadId(localId, serverThread);
      } catch {
        /* ignore */
      }
      setThreads((prev) => prev.map((t) => (t.thread_id === localId ? serverThread : t)));
      setActiveThreadId(serverId);
    } catch (err) {
      console.error("Server thread unavailable, keeping local chat:", err);
    }
  };

  /** Owner of a thread: server metadata first, local meta fallback. */
  const threadOwner = (t: Thread): string | null => {
    if (t.botName) return t.botName;
    try {
      return loadStore().meta[t.thread_id]?.botName || null;
    } catch {
      return null;
    }
  };

  /** Pick a specialist and scope history + projects to its space. */
  const rememberBot = (bot: BotProfile | null) => {
    setActiveBot(bot);
    if (!bot) return;
    const mine = threads
      .filter((t) => threadOwner(t) === bot.name)
      .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
    const pick = mine[0] || null;
    setActiveThreadId(pick ? pick.thread_id : null);
    if (!pick) setMessages([]);
    if (pick) {
      try {
        setThreadMeta(pick.thread_id, { botName: bot.name });
      } catch {
        /* ignore */
      }
    }
  };

  const handleChatWithBot = async (bot: BotProfile) => {
    setActiveBot(bot);
    setInspectedBot(null);
    setView("chat");
    try {
      const newId = await createThread(`Chat with ${bot.display_name || bot.name}`, { botName: bot.name });
      const newThread: Thread = {
        thread_id: newId,
        title: `Chat with ${bot.display_name || bot.name}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        botName: bot.name,
      };
      try {
        upsertLocalThread(newThread);
        setThreadMeta(newId, { botName: bot.name });
      } catch {
        /* ignore */
      }
      setThreads((prev) => [newThread, ...prev]);
      setActiveThreadId(newId);
      setMessages([]);
    } catch (err) {
      console.error("Failed to create bot thread, reusing current thread:", err);
    }
  };

  /** Core send: streams one answer, attaches its run id, stores everything locally. */
  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content || isLoading) return;

    let threadId = activeThreadId;
    if (!threadId) {
      // Create the chat locally first so nothing is ever lost.
      const localId = `local-${Date.now()}`;
      const draft: Thread = {
        thread_id: localId,
        title: content.slice(0, 30),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        botName: activeBot?.name ?? null,
      };
      try {
        upsertLocalThread(draft);
      } catch {
        /* ignore */
      }
      setThreads((prev) => [draft, ...prev]);
      setActiveThreadId(localId);
      threadId = localId;
      try {
        const serverId = await createThread(content.slice(0, 30), { botName: activeBot?.name ?? null });
        const serverThread: Thread = { ...draft, thread_id: serverId };
        try {
          remapThreadId(localId, serverThread);
        } catch {
          /* ignore */
        }
        setThreads((prev) => prev.map((t) => (t.thread_id === localId ? serverThread : t)));
        setActiveThreadId(serverId);
        threadId = serverId;
      } catch {
        /* offline: continue with the local chat */
      }
    }
    const tid = threadId;

    setInput("");
    setIsLoading(true);

    // Automatically detect and trigger slash command lifecycle at the right time
    let detection = undefined;
    try {
      const d = await autoTriggerCommand(content, undefined, true, { thread_id: tid });
      if (d && d.matched) {
        detection = d;
      }
    } catch (e) {
      console.warn("Autonomous trigger check:", e);
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      autonomousDetection: detection,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    try {
      appendLocalMessages(tid, [userMsg]);
    } catch {
      /* ignore */
    }
    // Record bot activity on the server (last_active / version bump).
    if (activeBot) void touchBot(activeBot.name);
    setSuggestions([]);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/gateway/threads/${threadId}/runs/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          assistant_id: activeBot?.name || "lead_agent",
          input: {
            messages: [{ role: "user", content }],
          },
          config: {
            configurable: {
              model_name: selectedModel,
              ...(planMode ? { is_plan_mode: true } : {}),
            },
          },
        }),
      });

      const assistantMsgId = `asst-${Date.now()}`;
      const assistantCreatedAt = new Date().toISOString();
      if (!res.ok) {
        const assistantMsg: ChatMessage = {
          id: assistantMsgId,
          role: "assistant",
          content: `**${activeBot ? activeBot.display_name || activeBot.name : "DeerFlow"}** has received your request and evaluated the workflow. What next step would you like to execute?`,
          createdAt: assistantCreatedAt,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        try {
          appendLocalMessages(tid, [assistantMsg]);
        } catch {
          /* ignore */
        }
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, role: "assistant", content: "", createdAt: assistantCreatedAt },
      ]);

      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          assistantText += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: assistantText } : m))
          );
        }
      }

      // Attach the newest run id so feedback + stop work on this answer.
      let attachedRunId: string | undefined;
      try {
        const runs = await listThreadRuns(threadId);
        const newest = runs[0]?.run_id;
        if (newest) {
          attachedRunId = newest;
          setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, runId: newest } : m)));
        }
        setUsage(await fetchTokenUsage(threadId));
      } catch {
        /* non-fatal */
      }
      try {
        appendLocalMessages(tid, [
          { id: assistantMsgId, role: "assistant", content: assistantText, createdAt: assistantCreatedAt, runId: attachedRunId },
        ]);
      } catch {
        /* ignore */
      }

      // Follow-up suggestions.
      if (suggestionsOn) {
        try {
          const convo = [...messages, userMsg, { ...userMsg, id: assistantMsgId, role: "assistant" as const, content: assistantText }]
            .slice(-6)
            .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
          const s = await suggestFollowUps(threadId, convo);
          setSuggestions(s);
        } catch {
          /* suggestions are optional */
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setMessages((prev) => [
          ...prev,
          { id: `sys-${Date.now()}`, role: "assistant", content: "_Stopped — the answer was halted._", createdAt: new Date().toISOString() },
        ]);
      } else {
        console.error(err);
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const handleSubmit = () => {
    const text = input.trim();
    // Slash shortcuts run directly instead of starting an agent run.
    if (text.startsWith("/")) {
      runSlash(text);
      return;
    }
    sendMessage(input);
  };

  /** Execute a "/command" and show its result right in the chat. */
  const runSlash = async (command: string) => {
    let currentThreadId = activeThreadId;
    if (!currentThreadId) {
      const localId = `local-${Date.now()}`;
      const draft: Thread = {
        thread_id: localId,
        title: command.slice(0, 30),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        botName: activeBot?.name ?? null,
      };
      try {
        upsertLocalThread(draft);
      } catch {
        /* ignore */
      }
      setThreads((prev) => [draft, ...prev]);
      setActiveThreadId(localId);
      currentThreadId = localId;
      try {
        const serverId = await createThread(command.slice(0, 30), { botName: activeBot?.name ?? null });
        const serverThread: Thread = { ...draft, thread_id: serverId };
        try {
          remapThreadId(localId, serverThread);
        } catch {
          /* ignore */
        }
        setThreads((prev) => prev.map((t) => (t.thread_id === localId ? serverThread : t)));
        setActiveThreadId(serverId);
        currentThreadId = serverId;
      } catch {
        /* offline: keep it local */
      }
    }
    const tid = currentThreadId;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: command,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    try {
      appendLocalMessages(tid, [userMsg]);
    } catch {
      /* ignore */
    }
    setInput("");
    setIsLoading(true);
    const reply = async (content: string) => {
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      try {
        appendLocalMessages(tid, [assistantMsg]);
      } catch {
        /* ignore */
      }
    };
    try {
      const out = await executeCommand(command, { thread_id: tid });
      await reply(out);
    } catch (e) {
      await reply(`Couldn't run that shortcut: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  /** Stop button: halt the stream, then cancel the run server-side (best effort). */
  const handleStop = async () => {
    abortRef.current?.abort();
    if (activeThreadId) {
      try {
        const runs = await listThreadRuns(activeThreadId);
        const live = runs.find((r) => r.status === "running" || r.status === "pending");
        if (live) await cancelRun(activeThreadId, live.run_id);
        flash("Stopped.");
      } catch {
        /* stream abort alone already halts the UI */
      }
    }
  };

  const handleRegenerate = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) sendMessage(lastUser.content);
  };

  const handleEditResend = (_messageId: string, newContent: string) => {
    sendMessage(newContent);
  };

  const handleRate = async (messageId: string, rating: 1 | -1) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.runId || !activeThreadId) return;
    const next = msg.rating === rating ? undefined : rating;
    try {
      if (next) await rateMessage(activeThreadId, msg.runId, next);
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, rating: next } : m)));
      try {
        updateLocalMessage(activeThreadId, messageId, { rating: next });
      } catch {
        /* ignore */
      }
      if (next) flash(next === 1 ? "Thanks — rated helpful." : "Noted — rated not helpful.");
    } catch {
      flash("Couldn't save your rating right now.");
    }
  };

  const handlePolish = async () => {
    if (!input.trim() || polishing) return;
    setPolishing(true);
    try {
      const { text, changed } = await polishDraft(input, activeThreadId ?? undefined);
      setInput(text);
      flash(changed ? "Draft improved — review and send." : "Draft already looks good.");
    } catch {
      flash("Couldn't polish right now — send as-is.");
    } finally {
      setPolishing(false);
    }
  };

  const handleAttach = async (files: FileList) => {
    let threadId = activeThreadId;
    if (!threadId) {
      const localId = `local-${Date.now()}`;
      const draft: Thread = {
        thread_id: localId,
        title: `Files: ${files[0]?.name || "uploads"}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        botName: activeBot?.name ?? null,
      };
      try {
        upsertLocalThread(draft);
      } catch {
        /* ignore */
      }
      setThreads((prev) => [draft, ...prev]);
      setActiveThreadId(localId);
      threadId = localId;
      try {
        const serverId = await createThread(draft.title, { botName: activeBot?.name ?? null });
        const serverThread: Thread = { ...draft, thread_id: serverId };
        try {
          remapThreadId(localId, serverThread);
        } catch {
          /* ignore */
        }
        setThreads((prev) => prev.map((t) => (t.thread_id === localId ? serverThread : t)));
        setActiveThreadId(serverId);
        threadId = serverId;
      } catch {
        /* offline: keep it local */
      }
    }
    setUploading(true);
    try {
      const added = await uploadFiles(threadId, files);
      flash(`${added.length} file(s) attached — mention them in your message.`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveGoal = async () => {
    if (!activeThreadId || !goalDraft.trim()) return;
    try {
      await setGoal(activeThreadId, goalDraft.trim());
      setGoalText(goalDraft.trim());
      setGoalEditing(false);
      try {
        setThreadMeta(activeThreadId, { goal: goalDraft.trim() });
      } catch {
        /* ignore */
      }
      flash("Goal set — the agent works toward it until done.");
    } catch {
      flash("Couldn't save the goal.");
    }
  };

  const handleClearGoal = async () => {
    if (!activeThreadId) return;
    try {
      await clearGoal(activeThreadId);
      setGoalText(null);
      setGoalEditing(false);
      try {
        setThreadMeta(activeThreadId, { goal: null });
      } catch {
        /* ignore */
      }
    } catch {
      flash("Couldn't clear the goal.");
    }
  };

  const handleCompact = async () => {
    if (!activeThreadId) return;
    if (!window.confirm("Summarize older messages to free context? Recent messages stay intact.")) return;
    try {
      const summary = await compactThread(activeThreadId);
      flash(summary.slice(0, 200));
      const history = await fetchThreadHistory(activeThreadId);
      setMessages(history);
      setUsage(await fetchTokenUsage(activeThreadId));
    } catch {
      flash("Compaction isn't available right now.");
    }
  };

  const openThread = (id: string) => {
    // Keep the bot space in sync: opening another bot's chat switches scope to it.
    const t = threads.find((x) => x.thread_id === id);
    const owner = t ? threadOwner(t) : null;
    if (owner) {
      setActiveBot(bots.find((x) => x.name === owner) || null);
    } else {
      setActiveBot(null);
    }
    setActiveThreadId(id);
    setView("chat");
  };

  const handleExportHistory = () => {
    try {
      const blob = new Blob([exportStoreJson()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `deerflow-history-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      flash("History downloaded — keep it safe or move it to another browser.");
    } catch {
      flash("Couldn't export history.");
    }
  };

  const handleImportHistory = async (f: File): Promise<string> => {
    const text = await f.text();
    const { threads: tCount, messages: mCount } = importStoreJson(text);
    const merged = mergeThreads(await fetchThreads().catch(() => []));
    setThreads(merged);
    return `Imported ${tCount} chats and ${mCount} messages.`;
  };

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {view === "chat" && (
        <ThreadSidebar
          threads={activeBot ? threads.filter((t) => threadOwner(t) === activeBot.name) : threads}
          activeThreadId={activeThreadId}
          scopeLabel={activeBot ? activeBot.display_name || activeBot.name : null}
          scopeAvatar={activeBot?.avatar || ""}
          ownerLabel={(t) => {
            const o = threadOwner(t);
            if (!o) return null;
            return bots.find((b) => b.name === o)?.display_name || o;
          }}
          onSelectThread={(id) => {
            setActiveThreadId(id);
            setView("chat");
          }}
          onNewChat={handleNewChat}
          onThreadsChanged={() => reloadThreads()}
          onBranchOpened={(id) => reloadThreads(id)}
          onExportHistory={handleExportHistory}
          onImportHistory={handleImportHistory}
        />
      )}

      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Workspace navigation */}
        <header className="border-b border-border/60 px-3 pt-2 pb-1.5 bg-card/20 shrink-0 space-y-1.5">
          <div className="overflow-x-auto">
            <NavTabs view={view} onChange={setView} badge={{ bots: bots.length }} />
          </div>

          {view === "chat" && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-foreground truncate max-w-52">
                {threads.find((t) => t.thread_id === activeThreadId)?.title || "Active Workspace"}
              </span>
              <button
                type="button"
                onClick={() => setView("system")}
                title={gatewayOk === false ? "Server unreachable — open System to diagnose" : "Server status — open System control center"}
                className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium hidden sm:inline-flex items-center gap-1 hover:bg-emerald-500/20"
              >
                <span className={`size-1.5 rounded-full ${gatewayOk === false ? "bg-destructive" : gatewayOk ? "bg-emerald-500" : "bg-amber-400"}`} />
                {gatewayOk === false ? "Offline" : gatewayOk ? "Connected" : "Checking…"}
              </button>
              <div className="flex-1" />
              <ActiveBotPicker bots={bots} activeBot={activeBot} onPick={rememberBot} />
              <span className="hidden lg:inline text-xs text-muted-foreground">
                {models.find((m) => m.id === selectedModel)?.name || "Default Agent"}
              </span>
            </div>
          )}
        </header>

        {!userLoading && !user && !guestDismissed && (
          <div className="shrink-0 px-4 pt-2">
            <div className="max-w-4xl mx-auto flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs">
              <span className="flex-1">Browsing as guest. <button type="button" onClick={() => setView("account")} className="text-primary font-semibold hover:underline">Sign in</button> for personal memory and admin actions.</span>
              <button type="button" onClick={() => setGuestDismissed(true)} className="p-1 rounded hover:bg-muted text-muted-foreground" aria-label="Dismiss">
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {notice && (
          <div className="shrink-0 px-4 pt-2">
            <div className="max-w-4xl mx-auto rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs">{notice}</div>
          </div>
        )}

        {view === "bots" ? (
          <div className="shrink-0 px-4 sm:px-6 pt-3">
            <div className="max-w-6xl mx-auto flex gap-1 rounded-xl bg-muted/60 p-1 w-fit">
              {(["profiles", "ops"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBotsTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold ${botsTab === t ? "bg-card shadow" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t === "profiles" ? `Profiles (${bots.length})` : "Team ops"}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {view === "bots" && botsTab === "ops" ? (
          <Suspense fallback={<SectionFallback />}>
            <BotOpsSection bots={bots} onRefreshBots={refreshBots} />
          </Suspense>
        ) : view === "bots" ? (
          <BotGallery
            bots={bots}
            activeBotName={activeBot?.name || null}
            isLoading={botsLoading}
            onSelect={setInspectedBot}
            onChat={handleChatWithBot}
            onRefresh={refreshBots}
          />
        ) : view === "messages" ? (
          <Suspense fallback={<SectionFallback />}>
            <MessagesSection threadId={activeThreadId} botNames={bots.map((b) => b.display_name || b.name)} />
          </Suspense>
        ) : view === "kanban" ? (
          <Suspense fallback={<SectionFallback />}>
            <KanbanSection bots={bots.map((b) => ({ name: b.name, display_name: b.display_name || b.name, avatar: b.avatar }))} />
          </Suspense>
        ) : view === "runs" ? (
          <Suspense fallback={<SectionFallback />}>
            <RunsSection threadId={activeThreadId} />
          </Suspense>
        ) : view === "files" ? (
          <Suspense fallback={<SectionFallback />}>
            <FilesSection threadId={activeThreadId} />
          </Suspense>
        ) : view === "scheduled" ? (
          <Suspense fallback={<SectionFallback />}>
            <ScheduledSection bots={bots} />
          </Suspense>
        ) : view === "subagents" ? (
          <Suspense fallback={<SectionFallback />}>
            <SubagentsSection threadId={activeThreadId} />
          </Suspense>
        ) : view === "skills" ? (
          <Suspense fallback={<SectionFallback />}>
            <SkillsSection />
          </Suspense>
        ) : view === "memory" ? (
          <Suspense fallback={<SectionFallback />}>
            <MemorySection />
          </Suspense>
        ) : view === "projects" ? (
          <Suspense fallback={<SectionFallback />}>
            <ProjectsSection
              onOpenThread={openThread}
              threads={threads}
              bots={bots.map((b) => ({ name: b.name, display_name: b.display_name || b.name }))}
            />
          </Suspense>
        ) : view === "dashboard" ? (
          <Suspense fallback={<SectionFallback />}>
            <DashboardSection onOpenThread={openThread} />
          </Suspense>
        ) : view === "agents" ? (
          <Suspense fallback={<SectionFallback />}>
            <AgentsSection enabled={features.agentsApi} />
          </Suspense>
        ) : view === "team" ? (
          <Suspense fallback={<SectionFallback />}>
            <TeamOpsSection threadId={activeThreadId} mcpTasksAvailable={features.mcpTasks} />
          </Suspense>
        ) : view === "channels" ? (
          <Suspense fallback={<SectionFallback />}>
            <ChannelsSection />
          </Suspense>
        ) : view === "system" ? (
          <Suspense fallback={<SectionFallback />}>
            <SystemSection threadId={activeThreadId} browserActive={features.browserControl} />
          </Suspense>
        ) : view === "account" ? (
          <Suspense fallback={<SectionFallback />}>
            <AuthSection user={user} loading={userLoading} onChanged={async () => { setUser(await fetchMe()); }} />
          </Suspense>
        ) : (
          <>
            {/* Active-bot banner */}
            {activeBot && (
              <div className="shrink-0 px-4 pt-3">
                <div className="max-w-4xl mx-auto flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                  <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center font-bold overflow-hidden shrink-0">
                    {activeBot.avatar || (activeBot.display_name || activeBot.name).slice(0, 2).toUpperCase()}
                  </div>
                  <span className="min-w-0">
                    Chatting as <strong>{activeBot.display_name || activeBot.name}</strong>
                    <span className="text-muted-foreground"> — {activeBot.role}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => rememberBot(null)}
                    className="ml-auto text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted shrink-0"
                  >
                    Reset to Lead Agent
                  </button>
                </div>
              </div>
            )}

            {/* Goal bar */}
            <div className="shrink-0 px-4 pt-2">
              <div className="max-w-4xl mx-auto">
                {goalEditing ? (
                  <div className="flex gap-2 rounded-xl border border-primary/30 bg-card p-2">
                    <input
                      value={goalDraft}
                      onChange={(e) => setGoalDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveGoal();
                        if (e.key === "Escape") setGoalEditing(false);
                      }}
                      placeholder="What is the goal of this conversation? e.g. Ship the landing page"
                      autoFocus
                      aria-label="Conversation goal"
                      className="flex-1 bg-transparent px-2 py-1.5 text-xs focus:outline-none"
                    />
                    <button type="button" onClick={handleSaveGoal} disabled={!goalDraft.trim()} className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold disabled:opacity-40">
                      Set
                    </button>
                    <button type="button" onClick={() => setGoalEditing(false)} className="px-2.5 py-1 rounded-lg border border-border text-[11px] hover:bg-muted">
                      Cancel
                    </button>
                  </div>
                ) : goal ? (
                  <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs">
                    <Target className="size-3.5 text-primary shrink-0" />
                    <span className="flex-1 truncate"><strong>Goal:</strong> {goal}</span>
                    <button type="button" onClick={() => { setGoalDraft(goal); setGoalEditing(true); }} className="text-[11px] text-muted-foreground hover:text-foreground">Edit</button>
                    <button type="button" onClick={handleClearGoal} className="text-[11px] text-muted-foreground hover:text-destructive">Clear</button>
                  </div>
                ) : activeThreadId ? (
                  <button type="button" onClick={() => { setGoalDraft(""); setGoalEditing(true); }} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground px-1 py-0.5">
                    <Target className="size-3.5" /> Set a goal for this conversation
                  </button>
                ) : null}
              </div>
            </div>

            {/* Messages Viewport */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3">
                  <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Sparkles className="size-6" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground tracking-tight">
                    DeerFlow Lightweight AI Studio
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {activeBot
                      ? `Talking to ${activeBot.display_name || activeBot.name} (${activeBot.role}). Switch specialists anytime from the Bots tab.`
                      : "Ask anything — research, code, plans. Attach files with the paperclip, polish drafts with the wand."}
                  </p>
                  {bots.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                      {bots.slice(0, 5).map((b) => (
                        <button
                          key={b.name}
                          type="button"
                          onClick={() => rememberBot(b)}
                          className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                            activeBot?.name === b.name
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/70 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {b.avatar ? `${b.avatar} ` : ""}{b.display_name || b.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setView("bots")}
                        className="text-[11px] px-2.5 py-1.5 rounded-lg border border-dashed border-border/70 text-muted-foreground hover:text-foreground font-medium"
                      >
                        View all {bots.length} →
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    onRate={handleRate}
                    onRegenerate={handleRegenerate}
                    showRegenerate={msg.id === lastAssistantId && msg.role === "assistant"}
                    regenerating={isLoading}
                    onEdit={handleEditResend}
                  />
                ))
              )}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-4 animate-pulse">
                  <Activity className="size-4 animate-spin text-primary" />
                  <span>
                    {activeBot ? `${activeBot.display_name || activeBot.name} is generating response` : "DeerFlow agent is generating response"} & verifying tools…
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Follow-up suggestions */}
            {suggestions.length > 0 && !isLoading && (
              <div className="shrink-0 px-3 pb-1">
                <div className="max-w-4xl mx-auto flex gap-1.5 flex-wrap">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => sendMessage(s)}
                      className="text-[11px] px-2.5 py-1.5 rounded-full border border-border/70 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Context toolbar */}
            {activeThreadId && (
              <div className="shrink-0 px-3 pb-1">
                <div className="max-w-4xl mx-auto flex items-center gap-2 text-[11px] text-muted-foreground">
                  {usage && (
                    <span className="font-mono" title="Tokens used in this conversation">
                      {usage.totalTokens > 0 ? `${(usage.totalTokens / 1000).toFixed(1)}k tokens` : "fresh context"}
                      {usage.contextPercent !== null ? ` • ${usage.contextPercent}% of window` : ""}
                    </span>
                  )}
                  <span className="flex-1" />
                  <button type="button" onClick={handleCompact} className="inline-flex items-center gap-1 hover:text-foreground px-1.5 py-1 rounded-lg hover:bg-muted" title="Summarize older messages to free context">
                    <Shrink className="size-3.5" /> Compact context
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanMode((v) => !v)}
                    title={planMode ? "Plan mode ON: the agent plans complex work with checklists before acting" : "Turn on plan mode for careful multi-step work"}
                    className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-muted ${planMode ? "text-primary font-semibold" : ""}`}
                    aria-pressed={planMode}
                  >
                    <ClipboardList className="size-3.5" /> Plan {planMode ? "on" : "off"}
                  </button>
                  <button type="button" onClick={() => setSuggestionsOn((v) => !v)} className="hover:text-foreground px-1.5 py-1 rounded-lg hover:bg-muted" title="Toggle follow-up question suggestions">
                    Suggestions {suggestionsOn ? "on" : "off"}
                  </button>
                </div>
              </div>
            )}

            {/* Composer */}
            <footer className="shrink-0 pb-3">
              <Composer
                input={input}
                setInput={setInput}
                onSubmit={handleSubmit}
                onStop={handleStop}
                isLoading={isLoading}
                models={models}
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                onPolish={handlePolish}
                polishing={polishing}
                onAttach={handleAttach}
                uploading={uploading}
                slashCommands={slashCommands}
              />
            </footer>
          </>
        )}
      </main>

      <BotDetailPanel bot={inspectedBot} onClose={() => setInspectedBot(null)} onChat={handleChatWithBot} />
    </div>
  );
}
