export type BotStatus = "active" | "sleeping" | "suspended" | "archived";

export interface BotStats {
  completed: number;
  failed: number;
  total_runs: number;
  avg_duration_sec: number;
}

export interface Bot {
  name: string;
  display_name: string;
  role: string;
  soul: string;
  model: string | null;
  toolsets: string[];
  skills: string[];
  avatar: string;
  status: BotStatus;
  epoch: string;
  department?: string;
  reports_to?: string | null;
  responsibilities?: string[];
  capabilities?: string[];
  heartbeat?: string | null;
  succession_fallback?: string | null;
  reputation_score?: number;
  task_stats?: BotStats;
  routines?: Array<Record<string, unknown>>;
  created_at: string;
  updated_at: string;
}

export interface EnsureBotRequest {
  display_name?: string | null;
  role?: string | null;
  soul?: string | null;
  template?: string | null;
  avatar?: string | null;
  department?: string | null;
  reports_to?: string | null;
  responsibilities?: string[];
  capabilities?: string[];
  succession_fallback?: string | null;
}

export interface UpdateBotRequest {
  display_name?: string | null;
  role?: string | null;
  soul?: string | null;
  model?: string | null;
  toolsets?: string[] | null;
  skills?: string[] | null;
  avatar?: string | null;
  status?: BotStatus | null;
  department?: string | null;
  reports_to?: string | null;
  responsibilities?: string[] | null;
  capabilities?: string[] | null;
  heartbeat?: string | null;
  succession_fallback?: string | null;
  reputation_score?: number | null;
  task_stats?: BotStats | null;
  routines?: Array<Record<string, unknown>> | null;
}

export interface CloneBotRequest {
  source: string;
  display_name?: string | null;
  role?: string | null;
  model?: string | null;
  department?: string | null;
  reports_to?: string | null;
}

export interface BotTemplate {
  slug: string;
  display: string;
  role: string;
  avatar: string;
  department?: string;
  reports_to?: string | null;
  responsibilities?: string[];
  capabilities?: string[];
}

export interface FleetHealthOverview {
  timestamp: string;
  summary: {
    total: number;
    healthy: number;
    stale: number;
    stalled: number;
    dead: number;
    sleeping: number;
    suspended: number;
    archived: number;
  };
  fleet_health_score: number;
  bots: Array<{
    bot_name: string;
    status: string;
    liveness: string;
    is_responsive: boolean;
    active_task_id?: string | null;
    last_heartbeat?: string | null;
    seconds_since_heartbeat?: number;
    lease_expired: boolean;
  }>;
  stalled_workers: Array<unknown>;
}

export interface OrgNode {
  name: string;
  display_name: string;
  role: string;
  avatar: string;
  department?: string;
  status: string;
  reputation_score?: number;
  subordinates: OrgNode[];
}

export interface OrganizationChart {
  departments: Record<string, Array<{
    name: string;
    display_name: string;
    role: string;
    avatar: string;
    status: string;
    reports_to?: string | null;
  }>>;
  tree: OrgNode[];
  graph: {
    nodes: Array<{ id: string; label: string; role: string; department?: string; avatar: string; status: string }>;
    edges: Array<{ from: string; to: string; relation: string }>;
  };
  total_bots: number;
}

export interface KillSwitchStatus {
  global_kill_switch_active: boolean;
  reason: string;
  engaged_at: string | null;
  paused_bots: Record<string, { reason: string; paused_at: string }>;
  paused_count: number;
}
