"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  LayersIcon,
  LightbulbIcon,
  SearchIcon,
  ShieldCheckIcon,
  TargetIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react";
import { type ReactNode, useMemo } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";

export interface PresetOption {
  id: string;
  name: string;
  badge: string;
  description: string;
  icon: ReactNode;
}

export const PRESET_OPTIONS: PresetOption[] = [
  {
    id: "auto",
    name: "Auto (Autopilot)",
    badge: "Auto",
    description: "Dynamically routes intent to optimal preset & toolset",
    icon: <ZapIcon className="size-3.5 text-amber-500" />,
  },
  {
    id: "plan",
    name: "Plan & Reason",
    badge: "Plan",
    description: "Architectural DAG planning, reasoning & hypothesis tests",
    icon: <LightbulbIcon className="size-3.5 text-blue-500" />,
  },
  {
    id: "deep_code",
    name: "Deep Code & Repair",
    badge: "Code",
    description: "AST repo mapping, atomic edits, auto-test & checkpoint rollback",
    icon: <WrenchIcon className="size-3.5 text-emerald-500" />,
  },
  {
    id: "research",
    name: "Deep Research",
    badge: "Research",
    description: "Multi-pass search, epistemic graph & source evaluation",
    icon: <SearchIcon className="size-3.5 text-purple-500" />,
  },
  {
    id: "discipline",
    name: "Discipline & Governance",
    badge: "Discipline",
    description: "Invariant governance, safety council & gap analysis",
    icon: <ShieldCheckIcon className="size-3.5 text-cyan-500" />,
  },
  {
    id: "mission_director",
    name: "Mission Director",
    badge: "Mission",
    description: "Hierarchical mission DAG, progress cards & KPI gates",
    icon: <TargetIcon className="size-3.5 text-rose-500" />,
  },
  {
    id: "autonomous_swarm",
    name: "Autonomous Swarm",
    badge: "Swarm",
    description: "Multi-agent parallel workers & blackboard coordination",
    icon: <LayersIcon className="size-3.5 text-indigo-500" />,
  },
];

export interface PresetSelectorProps {
  currentPreset?: string;
  disabled?: boolean;
  onSelectPreset: (presetId: string) => void;
  className?: string;
}

const DEFAULT_PRESET: PresetOption = PRESET_OPTIONS[0]!;

export function PresetSelector({
  currentPreset,
  disabled,
  onSelectPreset,
  className,
}: PresetSelectorProps) {
  const activePreset: PresetOption = useMemo(() => {
    const normalized = (currentPreset || "auto").toLowerCase();
    return (
      PRESET_OPTIONS.find((p) => p.id === normalized) ?? DEFAULT_PRESET
    );
  }, [currentPreset]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PromptInputButton
          className={cn(
            "h-7 max-w-32 min-w-0 gap-1 px-2 text-xs font-normal sm:max-w-44",
            className,
          )}
          disabled={disabled}
        >
          <div className="flex shrink-0 items-center">{activePreset.icon}</div>
          <span className="truncate text-xs font-medium">
            {activePreset.badge}
          </span>
          <ChevronDownIcon className="text-muted-foreground ml-auto size-3 shrink-0 opacity-60" />
        </PromptInputButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-1.5 shadow-lg">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-muted-foreground px-2 py-1 text-[11px] font-semibold tracking-wider uppercase">
            Execution Preset
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1" />
          {PRESET_OPTIONS.map((preset) => {
            const isSelected = activePreset.id === preset.id;
            return (
              <DropdownMenuItem
                key={preset.id}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 text-xs transition-colors",
                  isSelected
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-popover-foreground hover:bg-muted",
                )}
                onClick={() => onSelectPreset(preset.id)}
              >
                <div className="mt-0.5 shrink-0">{preset.icon}</div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    {preset.name}
                  </div>
                  <div className="text-muted-foreground line-clamp-2 text-[11px] font-normal leading-tight">
                    {preset.description}
                  </div>
                </div>
                {isSelected && (
                  <CheckIcon className="text-primary mt-0.5 ml-1 size-3.5 shrink-0" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
