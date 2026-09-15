"use client";

import React, { useState } from "react";
import { Plus, MessageSquare, Search, Trash2, PanelLeftClose, PanelLeft, Bot } from "lucide-react";
import { Thread } from "@/types/chat";

interface ThreadSidebarProps {
  threads: Thread[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewChat: () => void;
  onDeleteThread?: (id: string) => void;
}

export function ThreadSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onNewChat,
}: ThreadSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [search, setSearch] = useState("");

  const filtered = threads.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) {
    return (
      <div className="p-2 border-r border-border bg-card/40 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Expand sidebar"
        >
          <PanelLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={onNewChat}
          className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          title="New conversation"
        >
          <Plus className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-64 border-r border-border bg-card/40 flex flex-col h-screen shrink-0 transition-all">
      {/* Top Header */}
      <div className="p-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Bot className="size-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight">DeerFlow</span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3 pb-2">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-95 shadow-xs transition-opacity"
        >
          <Plus className="size-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 py-1">
        <div className="relative flex items-center">
          <Search className="size-3.5 absolute left-2.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-muted/50 border border-border/60 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Conversation Thread List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            No conversations found
          </div>
        ) : (
          filtered.map((t) => {
            const isActive = t.thread_id === activeThreadId;
            return (
              <button
                key={t.thread_id}
                type="button"
                onClick={() => onSelectThread(t.thread_id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-all ${
                  isActive
                    ? "bg-muted text-foreground font-medium shadow-2xs"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <MessageSquare className={`size-3.5 shrink-0 ${isActive ? "text-primary" : "opacity-60"}`} />
                <span className="truncate flex-1">{t.title}</span>
              </button>
            );
          })
        )}
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>Clean Chat Core</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/80">v2.0</span>
      </div>
    </aside>
  );
}
