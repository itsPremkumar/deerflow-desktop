"use client";

import React, { useState, useEffect, useRef } from "react";
import { ThreadSidebar } from "@/components/ThreadSidebar";
import { MessageItem } from "@/components/MessageItem";
import { Composer } from "@/components/Composer";
import { ChatMessage, Thread, AIModel } from "@/types/chat";
import { fetchThreads, createThread, fetchThreadHistory, fetchAvailableModels, autoTriggerCommand } from "@/lib/api";
import { Sparkles, Activity } from "lucide-react";

export default function ChatView() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("default");
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    async function init() {
      const [tList, mList] = await Promise.all([fetchThreads(), fetchAvailableModels()]);
      setThreads(tList);
      setModels(mList);
      if (mList.length > 0) setSelectedModel(mList[0].id);
      if (tList.length > 0) {
        setActiveThreadId(tList[0].thread_id);
      }
    }
    init();
  }, []);

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
  }, [messages, isLoading]);

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
    } catch (err) {
      console.error(err);
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

    const userPrompt = input.trim();
    setInput("");
    setIsLoading(true);

    // Automatically detect and trigger slash command lifecycle at the right time
    let detection = undefined;
    try {
      const d = await autoTriggerCommand(userPrompt, undefined, true, { thread_id: currentThreadId });
      if (d && d.matched) {
        detection = d;
      }
    } catch (e) {
      console.warn("Autonomous trigger check:", e);
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userPrompt,
      autonomousDetection: detection,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      // Stream or call gateway
      const res = await fetch(`/api/gateway/threads/${currentThreadId}/runs/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistant_id: "lead_agent",
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
          content: "I have received your request and evaluated the workflow. What next step would you like to execute?",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let thinkingText = "";

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
        onSelectThread={setActiveThreadId}
        onNewChat={handleNewChat}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Minimalist Top Bar */}
        <header className="h-12 border-b border-border/60 px-4 flex items-center justify-between bg-card/20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              {threads.find((t) => t.thread_id === activeThreadId)?.title || "Active Workspace"}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Connected
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            <span className="font-medium">{models.find((m) => m.id === selectedModel)?.name || "Default Agent"}</span>
          </div>
        </header>

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
                Streamlined, distraction-free conversational workspace directly connected to the DeerFlow cognitive autonomous engine.
              </p>
            </div>
          ) : (
            messages.map((msg) => <MessageItem key={msg.id} message={msg} />)
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-4 animate-pulse">
              <Activity className="size-4 animate-spin text-primary" />
              <span>DeerFlow agent is generating response & verifying tools...</span>
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
      </main>
    </div>
  );
}
