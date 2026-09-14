export type OrchestrationMode =
  | "mention"
  | "moderated"
  | "quorum"
  | "parallel"
  | "round_robin";

export type MessageIntent =
  | "discussion"
  | "proposal"
  | "vote"
  | "action"
  | "pass"
  | "card_update";

export interface GroupRoom {
  room_id: string;
  name: string;
  topic: string;
  members: string[];
  mode: OrchestrationMode;
  moderator: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface GroupMessage {
  id: string;
  sender: string;
  content: string;
  intent: MessageIntent;
  mentions: string[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreateRoomRequest {
  name: string;
  topic?: string;
  members?: string[] | null;
  mode?: OrchestrationMode;
  moderator?: string | null;
}

export interface PostRoomMessageRequest {
  sender: string;
  content: string;
  intent?: MessageIntent;
  metadata?: Record<string, unknown> | null;
}

export type GroupRunStatus =
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "interrupted";

export interface GroupRun {
  run_id: string;
  room_name: string;
  objective: string;
  members: string[];
  moderator: string | null;
  status: GroupRunStatus;
  created_at: string;
  updated_at: string;
  member_results: Record<string, { status: string; output: string }>;
  synthesis: string | null;
  error: string | null;
}

export interface StartGroupRunRequest {
  objective: string;
  members?: string[] | null;
  moderator?: string | null;
  max_parallel?: number;
}
