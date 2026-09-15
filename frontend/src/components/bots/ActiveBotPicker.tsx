"use client";

import React from "react";
import { BotProfile, botDisplayName, botInitials } from "@/types/bots";
import { ChevronDown, Bot } from "lucide-react";

interface ActiveBotPickerProps {
  bots: BotProfile[];
  activeBot: BotProfile | null;
  onPick: (bot: BotProfile | null) => void;
}

export function ActiveBotPicker({ bots, activeBot, onPick }: ActiveBotPickerProps) {
  return (
    <div className="relative flex items-center gap-2">
      <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
        {activeBot ? (
          activeBot.avatar ? <span>{activeBot.avatar}</span> : <span className="text-[10px]">{botInitials(activeBot)}</span>
        ) : (
          <Bot className="size-3.5" />
        )}
      </div>
      <select
        value={activeBot?.name || "lead_agent"}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "lead_agent") onPick(null);
          else onPick(bots.find((b) => b.name === v) || null);
        }}
        className="text-xs bg-muted/60 border border-border/80 rounded-lg pl-2 pr-7 py-1.5 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40 max-w-44 truncate appearance-none"
        title="Pick the specialist bot for this chat"
      >
        <option value="lead_agent">Lead Agent (auto-route)</option>
        {bots.map((b) => (
          <option key={b.name} value={b.name}>
            {botDisplayName(b)} — {b.role.slice(0, 32)}
          </option>
        ))}
      </select>
      <ChevronDown className="size-3.5 absolute right-2 pointer-events-none text-muted-foreground" />
    </div>
  );
}
