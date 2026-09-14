export interface ConsoleStats {
  total_runs: number;
  active_runs: number;
  failed_runs: number;
  total_threads: number;
  total_agents: number;
  total_tokens: number;
  total_cost: number | null;
  currency: string | null;
}

export type ConsoleRunStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "timeout"
  | "interrupted";

export interface ConsoleRunItem {
  run_id: string;
  thread_id: string;
  thread_title: string | null;
  assistant_id: string | null;
  status: ConsoleRunStatus;
  model_name: string | null;
  created_at: string | null;
  updated_at: string | null;
  duration_seconds: number | null;
  total_tokens: number;
  message_count: number;
  cost: number | null;
  error: string | null;
}

export interface ResumedRun {
  run_id: string;
  thread_id: string;
  status: string;
}
