/**
 * Project rules: user-authored custom instructions kept with workspace
 * settings, managed per browser via local settings.
 *
 * Rules are data only in this layer: CRUD helpers below are pure array
 * transforms (cheaply unit-tested), persistence flows through the existing
 * local-settings store, and agent-side application rides the hook tier
 * (O6) when it lands. Nothing here executes, prompts, or networks.
 */

export interface ProjectRule {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
}

export const MAX_PROJECT_RULES = 50;
export const MAX_PROJECT_RULE_TITLE_CHARS = 120;
export const MAX_PROJECT_RULE_CONTENT_CHARS = 4000;

function makeRuleId(): string {
  return `rule-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffff)
    .toString(36)
    .padStart(4, "0")}`;
}

export function createProjectRule(
  title = "",
  content = "",
): ProjectRule {
  return {
    id: makeRuleId(),
    title: title.slice(0, MAX_PROJECT_RULE_TITLE_CHARS),
    content: content.slice(0, MAX_PROJECT_RULE_CONTENT_CHARS),
    enabled: true,
  };
}

export function updateProjectRule(
  rules: ProjectRule[],
  id: string,
  patch: Partial<Pick<ProjectRule, "title" | "content" | "enabled">>,
): ProjectRule[] {
  return rules.map((rule) => {
    if (rule.id !== id) return rule;
    const next = { ...rule };
    if (patch.title !== undefined) {
      next.title = patch.title.slice(0, MAX_PROJECT_RULE_TITLE_CHARS);
    }
    if (patch.content !== undefined) {
      next.content = patch.content.slice(0, MAX_PROJECT_RULE_CONTENT_CHARS);
    }
    if (patch.enabled !== undefined) {
      next.enabled = patch.enabled;
    }
    return next;
  });
}

export function removeProjectRule(
  rules: ProjectRule[],
  id: string,
): ProjectRule[] {
  return rules.filter((rule) => rule.id !== id);
}

export function normalizeProjectRules(value: unknown): ProjectRule[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const rules: ProjectRule[] = [];
  for (const candidate of value) {
    if (typeof candidate !== "object" || candidate === null) continue;
    const record = candidate as Record<string, unknown>;
    if (typeof record.id !== "string" || !record.id || seen.has(record.id)) {
      continue;
    }
    seen.add(record.id);
    rules.push({
      id: record.id,
      title:
        typeof record.title === "string"
          ? record.title.slice(0, MAX_PROJECT_RULE_TITLE_CHARS)
          : "",
      content:
        typeof record.content === "string"
          ? record.content.slice(0, MAX_PROJECT_RULE_CONTENT_CHARS)
          : "",
      enabled: record.enabled !== false,
    });
    if (rules.length >= MAX_PROJECT_RULES) break;
  }
  return rules;
}
