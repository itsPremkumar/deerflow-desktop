"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, Brain, Copy, Check } from "lucide-react";
import { ChatMessage } from "@/types/chat";
import { ToolPill } from "./ToolPill";

interface MessageItemProps {
  message: ChatMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex w-full gap-3 py-4 px-4 rounded-xl transition-all ${isUser ? "bg-muted/30 ml-auto max-w-3xl" : "bg-card border border-border/50 max-w-4xl"}`}>
      <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground border border-border"}`}>
        {isUser ? <User className="size-4" /> : <Bot className="size-4 text-primary" />}
      </div>

      <div className="flex-1 overflow-hidden space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {isUser ? "You" : "DeerFlow Assistant"}
          </span>
          <button
            type="button"
            onClick={copyToClipboard}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Copy message"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </button>
        </div>

        {/* Collapsible Reasoning Thinking */}
        {message.thinking && (
          <div className="rounded-lg border border-border/60 bg-muted/20 text-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowThinking(!showThinking)}
              className="flex w-full items-center gap-1.5 px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              <Brain className="size-3.5 text-amber-500" />
              <span>Thought process</span>
              <span className="text-[10px] ml-auto">{showThinking ? "Hide" : "Show"}</span>
            </button>
            {showThinking && (
              <div className="p-2.5 border-t border-border/40 text-[11px] text-muted-foreground font-mono whitespace-pre-wrap">
                {message.thinking}
              </div>
            )}
          </div>
        )}

        {/* Tool Invocations */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-1 my-2">
            {message.toolCalls.map((tc) => (
              <ToolPill key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Markdown Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed break-words">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
