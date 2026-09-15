import { get, send } from "./http";

export interface PresenceMember {
  project_id: string;
  bot_name: string;
  role_in_project: string;
  status: string;
  current_task_id: string | null;
  blocked_reason: string | null;
  joined_at: string;
  last_activity: string;
}

export interface ProjectStateSnapshot {
  project_id: string;
  goal: string;
  phase: string;
  active_tasks: number;
  blocked_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  active_agents: number;
  arch_version: string;
  latest_decision: string | null;
  open_conflicts: number;
  open_risks: string[];
  last_verified: string | null;
}

export interface DecisionRecord {
  decision_id: string;
  title: string;
  body: string;
  reason: string;
  made_by: string;
  approved_by: string | null;
  created_at: string;
}

export interface CandidatePick {
  bot_name: string;
  capability_match: number;
  available: boolean;
  load: number;
  reputation: number;
  score: number;
}

const enc = encodeURIComponent;

export async function joinProject(projectId: string, botName: string, role = "worker"): Promise<PresenceMember> {
  return send<PresenceMember>(`/projects/${enc(projectId)}/join`, "POST", { bot_name: botName, role_in_project: role });
}

export async function leaveProject(projectId: string, botName: string): Promise<{ left: boolean }> {
  return send(`/projects/${enc(projectId)}/leave`, "POST", { bot_name: botName });
}

export async function fetchPresence(projectId: string): Promise<PresenceMember[]> {
  const d = await get<{ members: PresenceMember[] }>(`/projects/${enc(projectId)}/presence`);
  return d.members || [];
}

export async function fetchProjectState(projectId: string, refresh = false): Promise<ProjectStateSnapshot> {
  return get<ProjectStateSnapshot>(`/projects/${enc(projectId)}/state${refresh ? "?refresh=true" : ""}`);
}

export async function setProjectPhase(projectId: string, phase: string): Promise<ProjectStateSnapshot> {
  return send(`/projects/${enc(projectId)}/phase`, "POST", { phase });
}

export async function searchDecisions(projectId: string, q?: string): Promise<DecisionRecord[]> {
  const d = await get<{ decisions: DecisionRecord[] }>(`/projects/${enc(projectId)}/decisions${q ? `?q=${enc(q)}` : ""}`);
  return d.decisions || [];
}

export async function recordDecision(projectId: string, input: { title: string; body: string; reason?: string; made_by?: string }): Promise<DecisionRecord> {
  return send(`/projects/${enc(projectId)}/decisions`, "POST", input);
}

export async function fetchProjectEvents(projectId: string, afterSeq = 0): Promise<Array<Record<string, unknown>>> {
  const d = await get<{ events: Array<Record<string, unknown>> }>(`/projects/${enc(projectId)}/events?after_seq=${afterSeq}`);
  return d.events || [];
}

export async function fetchProjectContext(projectId: string, botRole = "worker"): Promise<Record<string, unknown>> {
  return get(`/projects/${enc(projectId)}/context?bot_role=${enc(botRole)}`);
}

export async function selectAgent(requiredCapabilities: string[], projectId?: string): Promise<{ candidates: CandidatePick[]; selected: CandidatePick | null }> {
  return send("/bots/select", "POST", { required_capabilities: requiredCapabilities, project_id: projectId });
}

export async function routeTaskType(taskType: string): Promise<{ primary: string; chain: string[]; category: string }> {
  return send("/bots/route-task", "POST", { task_type: taskType });
}

export async function fetchOpsAdvice(currentWorkers = 1): Promise<{ recommendation: string; max_workers: number; model_class: string; reasons: string[] }> {
  return get(`/ops/advice?current_workers=${currentWorkers}`);
}

export async function evaluatePolicy(action: string, actor = "*", projectId = "*"): Promise<{ verdict: string; reason: string }> {
  return send("/policy/evaluate", "POST", { action, actor, project_id: projectId });
}

export async function openCouncilCase(artifactId: string, artifactRef: string): Promise<Record<string, unknown>> {
  return send("/council/cases", "POST", { artifact_id: artifactId, artifact_ref: artifactRef });
}

export async function submitCouncilReview(caseId: string, reviewer: string, verdict: string, evidence = ""): Promise<{ outcome: string; reason: string }> {
  return send(`/council/cases/${enc(caseId)}/reviews`, "POST", { reviewer, verdict, evidence });
}

export async function createMission(objective: string): Promise<Record<string, unknown>> {
  return send("/missions", "POST", { objective });
}

export async function listMissions(): Promise<Array<Record<string, unknown>>> {
  const d = await get<{ missions: Array<Record<string, unknown>> }>(`/missions`);
  return d.missions || [];
}

export async function runBenchmarkSuite(name: string): Promise<Record<string, unknown>> {
  return send(`/benchmarks/suites/${enc(name)}/run`, "POST", {});
}

export async function interviewQuestions(objective: string): Promise<{ plan: Record<string, unknown>; questions: Array<Record<string, unknown>> }> {
  return send("/plan-mode/interview/questions", "POST", { objective });
}

export async function checkCompletion(projectId: string, evidence: Array<Record<string, unknown>>, taskKind = "code"): Promise<{ passed: boolean; missing: string[] }> {
  return send(`/projects/${enc(projectId)}/completion-check`, "POST", { evidence, task_kind: taskKind });
}
