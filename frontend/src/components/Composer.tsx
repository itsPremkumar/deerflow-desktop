"use client";

import React, { useRef, useEffect } from "react";
import { Send, Square, Wand2, Paperclip } from "lucide-react";
import { AIModel } from "@/types/chat";

interface ComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  isLoading: boolean;
  models: AIModel[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  /** Polish the draft with AI before sending. */
  onPolish?: () => void;
  polishing?: boolean;
  /** Attach files to the active conversation. */
  onAttach?: (files: FileList) => void;
  uploading?: boolean;
}

export function Composer({
  input,
  setInput,
  onSubmit,
  onStop,
  isLoading,
  models,
  selectedModel,
  onSelectModel,
  onPolish,
  polishing,
  onAttach,
  uploading,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-3">
      <div className="rounded-2xl border border-border bg-card shadow-sm focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all p-2.5">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything, design architectures, run tools…"
          rows={1}
          aria-label="Message the agent"
          className="w-full resize-none bg-transparent px-3 py-2 text-sm focus:outline-none placeholder:text-muted-foreground max-h-48 text-foreground"
        />

        <div className="flex items-center justify-between pt-2 border-t border-border/40 px-2 mt-1 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Model Selector */}
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="text-xs bg-muted/60 border border-border/80 rounded-lg px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 font-medium cursor-pointer max-w-36 truncate"
              title="Language model for this chat"
              aria-label="Language model"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {onAttach && (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                  title={uploading ? "Uploading…" : "Attach files"}
                  aria-label="Attach files"
                >
                  <Paperclip className="size-4" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) onAttach(e.target.files);
                    e.target.value = "";
                  }}
                />
              </>
            )}
            {onPolish && (
              <button
                type="button"
                onClick={onPolish}
                disabled={!input.trim() || polishing || isLoading}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                title={polishing ? "Polishing…" : "Improve my draft with AI"}
                aria-label="Improve draft with AI"
              >
                <Wand2 className={`size-4 ${polishing ? "animate-pulse text-primary" : ""}`} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLoading ? (
              <button
                type="button"
                onClick={onStop}
                className="size-8 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
                title="Stop generating"
                aria-label="Stop generating"
              >
                <Square className="size-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!input.trim()}
                onClick={onSubmit}
                className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:opacity-95 transition-opacity"
                title="Send message"
                aria-label="Send message"
              >
                <Send className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="text-[11px] text-center text-muted-foreground mt-2">
        <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> to send,{" "}
        <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Shift + Enter</kbd> for new line
      </div>
    </div>
  );
}
