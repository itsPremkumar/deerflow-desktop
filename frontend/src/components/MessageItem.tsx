"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, Brain, Copy, Check, ThumbsUp, ThumbsDown, RotateCcw, Pencil } from "lucide-react";
import { ChatMessage } from "@/types/chat";
import { ToolPill } from "./ToolPill";
import { TodoBlock } from "./TodoBlock";
import { HumanApprovalCard } from "./HumanApprovalCard";

interface MessageItemProps {
  message: ChatMessage;
  onApprovalDecision?: (approved: boolean) => void;
  /** Feedback wiring (assistant messages with a runId). */
  onRate?: (messageId: string, rating: 1 | -1) => void;
  /** "Ask again" for the latest assistant answer. */
  onRegenerate?: () => void;
  showRegenerate?: boolean;
  regenerating?: boolean;
  /** Edit & resend for your messages. */
  onEdit?: (messageId: string, newContent: string) => void;
}

export function MessageItem({ message, onApprovalDecision, onRate, onRegenerate, showRegenerate, regenerating, onEdit }: MessageItemProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

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

      <div className="flex-1 overflow-hidden space-y-2 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {isUser ? "You" : "DeerFlow Assistant"}
          </span>
          <div className="flex items-center gap-0.5">
            {/* Your rating teaches the system what good looks like */}
            {!isUser && onRate && message.runId && (
              <>
                <button
                  type="button"
                  onClick={() => onRate(message.id, 1)}
                  className={`p-1 rounded hover:bg-muted/60 transition-colors ${message.rating === 1 ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"}`}
                  title="Good answer"
                  aria-label="Rate answer good"
                >
                  <ThumbsUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRate(message.id, -1)}
                  className={`p-1 rounded hover:bg-muted/60 transition-colors ${message.rating === -1 ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}
                  title="Bad answer"
                  aria-label="Rate answer bad"
                >
                  <ThumbsDown className="size-3.5" />
                </button>
              </>
            )}
            {!isUser && showRegenerate && onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={regenerating}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40"
                title="Ask again (regenerate)"
                aria-label="Regenerate answer"
              >
                <RotateCcw className={`size-3.5 ${regenerating ? "animate-spin" : ""}`} />
              </button>
            )}
            {isUser && onEdit && (
              <button
                type="button"
                onClick={() => {
                  setDraft(message.content);
                  setEditing((v) => !v);
                }}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title="Edit and resend"
                aria-label="Edit and resend message"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={copyToClipboard}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title="Copy message"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            </button>
          </div>
        </div>

        {/* Autonomous Slash Command Lifecycle Badge */}
        {message.autonomousDetection && message.autonomousDetection.matched && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-xs space-y-1 my-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 font-mono font-semibold text-primary">
                ⚡ Auto-Triggered: {message.autonomousDetection.command}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                {message.autonomousDetection.phase}
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {Math.round(message.autonomousDetection.confidence * 100)}% confidence
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {message.autonomousDetection.reason}
            </p>
          </div>
        )}

        {editing && isUser && onEdit ? (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
              aria-label="Edit your message"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={() => {
                  onEdit(message.id, draft.trim());
                  setEditing(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40"
              >
                Send edited
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
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

            {message.todos && message.todos.length > 0 && (
              <TodoBlock todos={message.todos} />
            )}

            {message.approvalRequest && onApprovalDecision && (
              <HumanApprovalCard approval={message.approvalRequest} onDecision={onApprovalDecision} />
            )}

            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="space-y-1 my-2">
                {message.toolCalls.map((tc) => (
                  <ToolPill key={tc.id} toolCall={tc} />
                ))}
              </div>
            )}

            {message.content && (
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed break-words">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
