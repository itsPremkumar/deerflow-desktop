export type DeliveryMode = "auto" | "steer" | "follow_up";
export type AgentStatus = "idle" | "busy" | "completed";

export type MessageKind =
  | "message"
  | "request"
  | "task_assignment"
  | "task_handoff"
  | "question"
  | "answer"
  | "status"
  | "progress"
  | "warning"
  | "incident"
  | "recovery"
  | "decision"
  | "approval"
  | "escalation"
  | "result"
  | "review";

export interface AgentDescriptor {
  agent_id: string;
  name: string;
  role: string;
  status: AgentStatus;
  metadata: Record<string, unknown>;
  registered_at: string;
}

export interface InterAgentMessage {
  id: string;
  sender_name: string;
  receiver_name: string;
  content: string;
  mode: DeliveryMode;
  status: "queued" | "delivered" | "read";
  kind: MessageKind;
  created_at: string;
  delivered_at: string | null;
}
