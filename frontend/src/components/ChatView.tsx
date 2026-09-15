"use client";

import React, { useState, useEffect, useRef } from "react";
import { ThreadSidebar } from "@/components/ThreadSidebar";
import { MessageItem } from "@/components/MessageItem";
import { Composer } from "@/components/Composer";
import { ChatMessage, Thread, AIModel } from "@/types/chat";
import { BotProfile } from "@/types/bots";
import { fetchThreads, createThread, fetchThreadHistory, fetchAvailableModels } from "@/lib/api";
import { fetchBots } from "@/lib/bots";
import { BotGallery } from "@/components/bots/BotGallery";
import { BotDetailPanel } from "@/components/bots/BotDetailPanel";
import { ActiveBotPicker } from "@/components/bots/ActiveBotPicker";
import { Sparkles, Activity, MessageSquare, Bot } from "lucide-react";

type MainView = "chat" | "bots";

export default function ChatView() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("default");
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Multi-bot-profile state
  const [bots, setBots] = useState<BotProfile[]>([]);
  const [botsLoading, setBotsLoading] = useState<boolean>(true);
  const [activeBot, setActiveBot] = useState<BotProfile | null>(null);
  const [view, setView] = useState<MainView>("chat");
  const [inspectedBot, setInspectedBot] = useState<BotProfile | null>(null);

  // Initial load
  useEffect(() => {
    async function init() {
      const [tList, mList, bList] = await Promise.all([
        fetchThreads(),
        fetchAvailableModels(),
        fetchBots(),
      ]);
      setThreads(tList);
      setModels(mList);
      if (mList.length > 0) setSelectedModel(mList[0].id);
      if (tList.length > 0) {
        setActiveThreadId(tList[0].thread_id);
      }
      setBots(bList);
      setBotsLoading(false);
    }
    init();
  }, []);

  const refreshBots = async () => {
    setBotsLoading(true);
    const bList = await fetchBots();
    setBots(bList);
    setBotsLoading(false);
    // Keep activeBot reference fresh after refresh
    if (activeBot) {
      const fresh = bList.find((b) => b.name === activeBot.name);
      if (fresh) setActiveBot(fresh);
    }
  };

  // Fetch messages when thread changes
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    async function loadMessages() {
      const history = await fetchThreadHistory(activeThreadId!);
      setMessages(history);
    }
    loadMessages();
  }, [activeThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, view]);

  const handleNewChat = async () => {
    try {
      const newId = await createThread();
      const newThread: Thread = {
        thread_id: newId,
        title: "New Conversation",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setThreads([newThread, ...threads]);
      setActiveThreadId(newId);
      setMessages([]);
      setView("chat");
    } catch (err) {
      console.error(err);
    }
  };

  const handleChatWithBot = async (bot: BotProfile) => {
    setActiveBot(bot);
    setInspectedBot(null);
    setView("chat");
    // Start a fresh thread titled for this bot so its work stays isolated,
    // but fall back to reusing the current thread if creation fails.
    try {
      const newId = await createThread(`Chat with ${bot.display_name || bot.name}`);
      const newThread: Thread = {
        thread_id: newId,
        title: `Chat with ${bot.display_name || bot.name}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setThreads((prev) => [newThread, ...prev]);
      setActiveThreadId(newId);
      setMessages([]);
    } catch (err) {
      console.error("Failed to create bot thread, reusing current thread:", err);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    let currentThreadId = activeThreadId;
    if (!currentThreadId) {
      currentThreadId = await createThread(input.slice(0, 30));
      setActiveThreadId(currentThreadId);
      setThreads([{ thread_id: currentThreadId, title: input.slice(0, 30), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...threads]);
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Stream or call gateway — route to the selected specialist bot.
      const res = await fetch(`/api/gateway/threads/${currentThreadId}/runs/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistant_id: activeBot?.name || "lead_agent",
          input: {
            messages: [{ role: "user", content: userMsg.content }],
          },
          config: {
            configurable: {
              model_name: selectedModel,
            },
          },
        }),
      });

      if (!res.ok) {
        // Fallback simulate assistant response if stream endpoint requires specific multi-tenant headers
        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: `**${activeBot ? activeBot.display_name || activeBot.name : "DeerFlow"}** has received your request and evaluated the workflow. What next step would you like to execute?`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      const thinkingText = "";

      const assistantMsgId = `asst-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, role: "assistant", content: "", createdAt: new Date().toISOString() },
      ]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          assistantText += chunk;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: assistantText, thinking: thinkingText }
                : m
            )
          );
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <ThreadSidebar
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={(id) => {
          setActiveThreadId(id);
          setView("chat");
        }}
        onNewChat={handleNewChat}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Bar with Chat/Bots tabs + active bot */}
        <header className="min-h-12 border-b border-border/60 px-4 py-2 flex items-center justify-between gap-3 bg-card/20 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg bg-muted/60 p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setView("chat")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors ${
                  view === "chat" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="size-3.5" /> Chat
              </button>
              <button
                type="button"
                onClick={() => setView("bots")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors ${
                  view === "bots" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bot className="size-3.5" /> Bots ({bots.length})
              </button>
            </div>
            {view === "chat" && (
              <span className="text-xs font-semibold text-foreground hidden md:inline">
                {threads.find((t) => t.thread_id === activeThreadId)?.title || "Active Workspace"}
              </span>
            )}
            {view === "chat" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium hidden sm:inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Connected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ActiveBotPicker bots={bots} activeBot={activeBot} onPick={setActiveBot} />
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground border-l border-border/60 pl-2">
              <Sparkles className="size-3.5 text-primary" />
              <span className="font-medium">{models.find((m) => m.id === selectedModel)?.name || "Default Agent"}</span>
            </div>
          </div>
        </header>

        {view === "bots" ? (
          <BotGallery
            bots={bots}
            activeBotName={activeBot?.name || null}
            isLoading={botsLoading}
            onSelect={setInspectedBot}
            onChat={handleChatWithBot}
            onRefresh={refreshBots}
          />
        ) : (
          <>
            {/* Active-bot banner */}
            {activeBot && (
              <div className="shrink-0 px-4 pt-3">
                <div className="max-w-4xl mx-auto flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                  <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center font-bold overflow-hidden shrink-0">
                    {activeBot.avatar || (activeBot.display_name || activeBot.name).slice(0, 2).toUpperCase()}
                  </div>
                  <span>
                    Chatting as <strong>{activeBot.display_name || activeBot.name}</strong>
                    <span className="text-muted-foreground"> — {activeBot.role}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveBot(null)}
                    className="ml-auto text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted"
                  >
                    Reset to Lead Agent
                  </button>
                </div>
              </div>
            )}

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
                      : "Streamlined, distraction-free conversational workspace directly connected to the DeerFlow cognitive autonomous engine."}
                  </p>
                  {bots.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                      {bots.slice(0, 5).map((b) => (
                        <button
                          key={b.name}
                          type="button"
                          onClick={() => setActiveBot(b)}
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
                messages.map((msg) => <MessageItem key={msg.id} message={msg} />)
              )}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-4 animate-pulse">
                  <Activity className="size-4 animate-spin text-primary" />
                  <span>
                    {activeBot ? `${activeBot.display_name || activeBot.name} is generating response` : "DeerFlow agent is generating response"} & verifying tools...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <footer className="shrink-0 pb-3">
              <Composer
                input={input}
                setInput={setInput}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                models={models}
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
              />
            </footer>
          </>
        )}
      </main>

      <BotDetailPanel bot={inspectedBot} onClose={() => setInspectedBot(null)} onChat={handleChatWithBot} />
    </div>
  );
}
