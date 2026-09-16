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

export interface DMInboxMessage {
  delivery_id: string;
  sender: string;
  recipient: string;
  body: string;
  status: string;
  created_at: number;
}

export async function fetchInbox(botName: string, unreadOnly = false): Promise<{ messages: DMInboxMessage[]; unread_count: number }> {
  return get(`/bots/${enc(botName)}/inbox?unread_only=${unreadOnly ? "true" : "false"}`);
}

export async function sendDM(botName: string, target: string, message: string): Promise<Record<string, unknown>> {
  return send(`/bots/${enc(botName)}/dm`, "POST", { target, message });
}

export async function ackDM(botName: string, deliveryId: string): Promise<Record<string, unknown>> {
  return send(`/bots/${enc(botName)}/inbox/${enc(deliveryId)}/ack`, "POST", {});
}

export async function fetchBotChat(botName: string): Promise<{ canonical_thread_id: string; unread_count: number; recent: DMInboxMessage[] }> {
  return get(`/bots/${enc(botName)}/chat`);
}

export async function fetchConstitution(projectId: string): Promise<{ present: boolean; markdown?: string; sha16?: string }> {
  return get(`/projects/${enc(projectId)}/constitution`);
}

export async function fetchLocks(projectId: string): Promise<{ locks: Array<Record<string, unknown>>; pending_requests: Array<Record<string, unknown>> }> {
  return get(`/projects/${enc(projectId)}/locks`);
}

export async function acquireLock(projectId: string, input: { scope: string; path: string; owner_bot: string; reason?: string }): Promise<Record<string, unknown>> {
  return send(`/projects/${enc(projectId)}/locks`, "POST", input);
}

export async function releaseLock(projectId: string, lockId: string, requesterBot: string): Promise<Record<string, unknown>> {
  return send(`/projects/${enc(projectId)}/locks/${enc(lockId)}?requester_bot=${enc(requesterBot)}`, "DELETE");
}

export async function fetchHandoffs(projectId: string): Promise<Array<Record<string, unknown>>> {
  const d = await get<{ handoffs: Array<Record<string, unknown>> }>(`/projects/${enc(projectId)}/handoffs`);
  return d.handoffs || [];
}

export async function acceptHandoff(projectId: string, handoffId: string, toBot: string): Promise<Record<string, unknown>> {
  return send(`/projects/${enc(projectId)}/handoffs/${enc(handoffId)}/accept`, "POST", { to_bot: toBot });
}

export async function fetchSkillUsage(): Promise<Array<Record<string, unknown>>> {
  const d = await get<{ usage: Array<Record<string, unknown>> }>(`/skills/usage`);
  return d.usage || [];
}

export async function fetchCuratorReport(): Promise<Record<string, unknown>> {
  return get(`/skills/curator`);
}

export async function runCurator(dryRun = true): Promise<Record<string, unknown>> {
  return send(`/skills/curator/run?dry_run=${dryRun ? "true" : "false"}&suggest_merges=true`, "POST", {});
}

export async function fetchSkillTiers(): Promise<Array<Record<string, unknown>>> {
  const d = await get<{ tiers: Array<Record<string, unknown>> }>(`/skills/tiers`);
  return d.tiers || [];
}

export async function fetchBlueprints(): Promise<Array<Record<string, unknown>>> {
  const d = await get<{ blueprints: Array<Record<string, unknown>> }>(`/scheduled-tasks/blueprints`);
  return d.blueprints || [];
}

export async function launchBlueprint(blueprintId: string, values: Record<string, string>): Promise<Record<string, unknown>> {
  return send(`/scheduled-tasks/blueprints/${enc(blueprintId)}/launch`, "POST", { values });
}

export async function fetchIncidents(taskId: string): Promise<Array<Record<string, unknown>>> {
  const d = await get<{ incidents: Array<Record<string, unknown>> }>(`/scheduled-tasks/${enc(taskId)}/incidents`);
  return d.incidents || [];
}

export async function fetchBenchmarkSuites(): Promise<Array<Record<string, unknown>>> {
  const d = await get<{ suites: Array<Record<string, unknown>> }>(`/benchmarks/suites`);
  return d.suites || [];
}

export async function fetchConsoleInsights(days = 7): Promise<{ digest: string; report: Record<string, unknown> }> {
  return get(`/console/insights?days=${days}`);
}

export async function listCouncilCases(status?: string): Promise<Array<Record<string, unknown>>> {
  const d = await get<{ cases: Array<Record<string, unknown>> }>(`/council/cases${status ? `?status=${enc(status)}` : ""}`);
  return d.cases || [];
}

export async function fetchPolicies(): Promise<Array<Record<string, unknown>>> {
  const d = await get<{ policies: Array<Record<string, unknown>> }>(`/policy/policies`);
  return d.policies || [];
}

export async function fetchPendingApprovals(): Promise<Array<Record<string, unknown>>> {
  const d = await get<{ approvals: Array<Record<string, unknown>> }>(`/policy/approvals?status=pending`);
  return d.approvals || [];
}

export async function decideApproval(requestId: string, approved: boolean): Promise<Record<string, unknown>> {
  return send(`/policy/approvals/${enc(requestId)}/decide`, "POST", { approved });
}

export async function localEndpointHealth(baseUrl: string): Promise<{ reachable: boolean; models: string[]; reason: string }> {
  return get(`/models/local/health?base_url=${enc(baseUrl)}`);
}

export interface WarRoomSnapshot {
  project_id: string;
  status: string;
  state: Record<string, unknown>;
  members: Array<{
    bot_name: string;
    role_in_project: string;
    status: string;
    current_task_id: string | null;
    joined_at: string;
    last_activity: string;
  }>;
  active_locks: Array<{
    lock_id: string;
    scope: string;
    path: string;
    owner_bot: string;
    reason: string;
    expires_at: number;
  }>;
  pending_lock_requests: Array<Record<string, unknown>>;
  handoffs: Array<{
    handoff_id: string;
    task_id: string;
    from_bot: string;
    to_bot: string;
    objective: string;
    status: string;
  }>;
  decisions: Array<{
    decision_id: string;
    title: string;
    status: string;
    decided_by: string;
  }>;
  events: Array<{
    seq: number;
    event_id: string;
    type: string;
    actor: string;
    payload: Record<string, unknown>;
    created_at: number;
  }>;
  kill_switch: {
    active: boolean;
    reason: string;
    paused_bots: Record<string, unknown>;
  };
}

export async function fetchWarRoomData(projectId: string): Promise<WarRoomSnapshot> {
  return get(`/projects/${enc(projectId)}/war-room`);
}

