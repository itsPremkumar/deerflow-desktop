export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  output?: string;
  status?: "running" | "completed" | "failed";
}

export interface TodoItem {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

export interface ArtifactItem {
  id: string;
  name: string;
  type: string;
  content: string;
  language?: string;
}

export interface HumanApproval {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  prompt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string;
  toolCalls?: ToolCall[];
  todos?: TodoItem[];
  artifacts?: ArtifactItem[];
  approvalRequest?: HumanApproval;
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

export interface SlashCommandInfo {
  command: string;
  category: string;
  description: string;
  usage: string;
  is_core: boolean;
  is_autonomous_trigger: boolean;
  requires_approval: boolean;
}

export interface SlashCommandResult {
  status: string;
  command: string;
  output: string;
  data: Record<string, unknown>;
  autonomous_directives?: string[];
}

