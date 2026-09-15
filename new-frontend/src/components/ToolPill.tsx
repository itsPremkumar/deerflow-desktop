"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Terminal, CheckCircle2, Clock } from "lucide-react";
import { ToolCall } from "@/types/chat";

interface ToolPillProps {
  toolCall: ToolCall;
}

export function ToolPill({ toolCall }: ToolPillProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-1.5 rounded-lg border border-border/80 bg-muted/40 text-xs overflow-hidden transition-colors">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3 py-1.5 font-mono text-muted-foreground hover:bg-muted/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal className="size-3.5 text-primary" />
          <span className="font-semibold text-foreground/90">{toolCall.name}</span>
          <span className="text-[10px] text-muted-foreground">executed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="size-3 text-emerald-500" />
          {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border/60 bg-background/50 p-2.5 space-y-2">
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Arguments</div>
            <pre className="p-2 rounded bg-muted/80 text-[11px] overflow-x-auto text-foreground font-mono">
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </div>
          {toolCall.output && (
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Result</div>
              <pre className="p-2 rounded bg-muted/80 text-[11px] overflow-x-auto text-foreground font-mono max-h-48">
                {toolCall.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
