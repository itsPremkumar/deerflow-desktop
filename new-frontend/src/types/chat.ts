export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  output?: string;
  status?: "running" | "completed" | "failed";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string;
  toolCalls?: ToolCall[];
  createdAt: string;
}

export interface Thread {
  thread_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  status?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
}
