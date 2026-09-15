import { BotProfile, BotTemplate, FleetHealth } from "@/types/bots";

const BASE_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "/api/gateway";

function normalizeBot(raw: Record<string, unknown>): BotProfile {
  const taskStats = (raw.task_stats as BotProfile["task_stats"]) || {};
  return {
    name: String(raw.name || "unknown"),
    display_name: String(raw.display_name || raw.name || "Unknown"),
    role: String(raw.role || "Specialist Agent"),
    soul: typeof raw.soul === "string" ? raw.soul : "",
    model: typeof raw.model === "string" ? raw.model : undefined,
    toolsets: Array.isArray(raw.toolsets) ? (raw.toolsets as string[]) : [],
    skills: Array.isArray(raw.skills) ? (raw.skills as string[]) : [],
    avatar: typeof raw.avatar === "string" ? raw.avatar : "",
    status: typeof raw.status === "string" ? raw.status : "active",
    last_active: typeof raw.last_active === "string" ? raw.last_active : null,
    version: typeof raw.version === "number" ? raw.version : 1,
    epoch: typeof raw.epoch === "string" ? raw.epoch : null,
    department: typeof raw.department === "string" ? raw.department : "engineering",
    reports_to: typeof raw.reports_to === "string" ? raw.reports_to : null,
    responsibilities: Array.isArray(raw.responsibilities) ? (raw.responsibilities as string[]) : [],
    capabilities: Array.isArray(raw.capabilities) ? (raw.capabilities as string[]) : [],
    heartbeat: typeof raw.heartbeat === "string" ? raw.heartbeat : null,
    succession_fallback: typeof raw.succession_fallback === "string" ? raw.succession_fallback : null,
    reputation_score: typeof raw.reputation_score === "number" ? raw.reputation_score : 1,
    task_stats: taskStats,
    routines: Array.isArray(raw.routines) ? (raw.routines as Array<Record<string, unknown>>) : [],
    created_at: typeof raw.created_at === "string" ? raw.created_at : null,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : null,
  };
}

/** Offline fallback so the Bots UI is useful without a live Gateway. */
export function fallbackBots(): BotProfile[] {
  const now = new Date().toISOString();
  const make = (b: Partial<BotProfile> & { name: string }): BotProfile =>
    normalizeBot({
      display_name: b.name,
      role: "Specialist Agent",
      toolsets: [],
      skills: [],
      avatar: "",
      status: "active",
      version: 1,
      department: "engineering",
      responsibilities: [],
      capabilities: [],
      reputation_score: 1,
      task_stats: {},
      routines: [],
      created_at: now,
      updated_at: now,
      ...b,
    });
  return [
    make({
      name: "architect",
      display_name: "Architect",
      role: "System Architect & Technical Lead",
      avatar: "🏗️",
      department: "engineering",
      reports_to: "cto",
      responsibilities: ["System design", "Interface boundaries", "Scalability", "Design documentation"],
      capabilities: ["system_design", "refactoring", "boundary_enforcement"],
      skills: ["code-review", "architecture"],
      toolsets: ["filesystem", "git", "shell"],
      reputation_score: 0.97,
      task_stats: { total: 128, succeeded: 124, failed: 4 },
    }),
    make({
      name: "coder",
      display_name: "Coder",
      role: "Software Engineer & Backend Developer",
      avatar: "💻",
      department: "engineering",
      reports_to: "architect",
      responsibilities: ["Feature implementation", "Bug fixing", "Algorithm development"],
      capabilities: ["python", "typescript", "backend", "code_generation"],
      skills: ["testing", "debugging"],
      toolsets: ["filesystem", "shell", "git"],
      reputation_score: 0.94,
      task_stats: { total: 342, succeeded: 321, failed: 21 },
    }),
    make({
      name: "researcher",
      display_name: "Researcher",
      role: "Deep Researcher & Synthesis Specialist",
      avatar: "🔍",
      department: "product",
      reports_to: "product-manager",
      responsibilities: ["Information discovery", "Fact verification", "Market & tech research", "Synthesis"],
      capabilities: ["web_search", "document_synthesis", "fact_checking"],
      skills: ["deep-research", "fact-check"],
      toolsets: ["web", "browser"],
      reputation_score: 0.96,
      task_stats: { total: 215, succeeded: 207, failed: 8 },
    }),
    make({
      name: "reviewer",
      display_name: "Reviewer",
      role: "Code & Quality Reviewer",
      avatar: "🧭",
      department: "qa",
      reports_to: "architect",
      responsibilities: ["Code review", "Standards enforcement", "Security auditing"],
      capabilities: ["code_audit", "style_enforcement", "security_review"],
      skills: ["code-review"],
      toolsets: ["filesystem", "git"],
      reputation_score: 0.92,
      task_stats: { total: 187, succeeded: 176, failed: 11 },
    }),
    make({
      name: "tester",
      display_name: "Tester",
      role: "QA & Automated Verification Specialist",
      avatar: "🧪",
      department: "qa",
      reports_to: "qa",
      responsibilities: ["Unit test execution", "Edge case validation", "Quality gate evaluation"],
      capabilities: ["pytest", "test_automation", "failure_triage"],
      skills: ["qa", "e2e-testing"],
      toolsets: ["shell", "filesystem"],
      reputation_score: 0.9,
      task_stats: { total: 156, succeeded: 144, failed: 12 },
    }),
    make({
      name: "security",
      display_name: "Security",
      role: "Security & Vulnerability Analyst",
      avatar: "🛡️",
      department: "security",
      reports_to: "cto",
      responsibilities: ["Vulnerability scanning", "Permission boundaries", "Credential safety"],
      capabilities: ["vulnerability_analysis", "credential_auditing", "risk_mitigation"],
      skills: ["security-audit"],
      toolsets: ["filesystem", "shell"],
      reputation_score: 0.98,
      task_stats: { total: 89, succeeded: 88, failed: 1 },
    }),
  ];
}

export async function fetchBots(params?: { status?: string; department?: string }): Promise<BotProfile[]> {
  try {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.department) qs.set("department", params.department);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const res = await fetch(`${BASE_URL}/bots${suffix}`);
    if (!res.ok) return fallbackBots();
    const data = await res.json();
    const list = Array.isArray(data.bots) ? data.bots : [];
    if (list.length === 0) return fallbackBots();
    return list.map((b: Record<string, unknown>) => normalizeBot(b));
  } catch (err) {
    console.error("Failed to fetch bots:", err);
    return fallbackBots();
  }
}

export async function fetchBot(name: string): Promise<BotProfile | null> {
  try {
    const res = await fetch(`${BASE_URL}/bots/${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    return normalizeBot(await res.json());
  } catch (err) {
    console.error(`Failed to fetch bot ${name}:`, err);
    return null;
  }
}

export async function fetchBotTemplates(): Promise<BotTemplate[]> {
  try {
    const res = await fetch(`${BASE_URL}/bots/templates`);
    if (!res.ok) return [];
    const data = await res.json();
    const raw = data.templates;
    if (Array.isArray(raw)) return raw as BotTemplate[];
    if (raw && typeof raw === "object")
      return Object.entries(raw).map(([name, t]) => ({ name, ...(t as Omit<BotTemplate, "name">) }));
    return [];
  } catch (err) {
    console.error("Failed to fetch bot templates:", err);
    return [];
  }
}

export async function fetchDepartments(): Promise<string[]> {
  try {
    const res = await fetch(`${BASE_URL}/bots/departments`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.departments) ? data.departments : [];
  } catch (err) {
    console.error("Failed to fetch departments:", err);
    return [];
  }
}

export function computeFleetHealth(bots: BotProfile[]): FleetHealth {
  const total = bots.length;
  const active = bots.filter((b) => b.status === "active").length;
  const paused = bots.filter((b) => b.status === "paused").length;
  const disabled = bots.filter((b) => b.status === "disabled").length;
  const avg_reputation =
    total === 0 ? 0 : bots.reduce((sum, b) => sum + (b.reputation_score || 0), 0) / total;
  const total_tasks = bots.reduce((sum, b) => sum + (Number(b.task_stats?.total) || 0), 0);
  return { total, active, paused, disabled, avg_reputation, total_tasks };
}

export function uniqueDepartments(bots: BotProfile[]): string[] {
  return Array.from(new Set(bots.map((b) => b.department || "general"))).sort();
}
