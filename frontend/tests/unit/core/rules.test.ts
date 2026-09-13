import { describe, expect, it } from "@rstest/core";

import {
  createProjectRule,
  MAX_PROJECT_RULE_CONTENT_CHARS,
  MAX_PROJECT_RULE_TITLE_CHARS,
  MAX_PROJECT_RULES,
  normalizeProjectRules,
  removeProjectRule,
  updateProjectRule,
  type ProjectRule,
} from "@/core/rules";

function makeRule(overrides: Partial<ProjectRule> = {}): ProjectRule {
  return {
    id: "rule-1",
    title: "Title",
    content: "Content",
    enabled: true,
    ...overrides,
  };
}

describe("createProjectRule", () => {
  it("creates an enabled rule with a unique id", () => {
    const first = createProjectRule("T", "C");
    const second = createProjectRule("T", "C");
    expect(first.enabled).toBe(true);
    expect(first.title).toBe("T");
    expect(first.id).not.toBe(second.id);
  });

  it("caps title and content length", () => {
    const rule = createProjectRule(
      "t".repeat(MAX_PROJECT_RULE_TITLE_CHARS + 10),
      "c".repeat(MAX_PROJECT_RULE_CONTENT_CHARS + 10),
    );
    expect(rule.title).toHaveLength(MAX_PROJECT_RULE_TITLE_CHARS);
    expect(rule.content).toHaveLength(MAX_PROJECT_RULE_CONTENT_CHARS);
  });
});

describe("updateProjectRule", () => {
  it("patches only the matching rule", () => {
    const rules = [makeRule({ id: "a" }), makeRule({ id: "b", enabled: true })];
    const next = updateProjectRule(rules, "b", {
      title: "New",
      enabled: false,
    });
    expect(next[0]).toEqual(rules[0]);
    expect(next[1]).toMatchObject({ title: "New", enabled: false });
    expect(rules[1]?.enabled).toBe(true);
  });

  it("ignores unknown ids", () => {
    const rules = [makeRule({ id: "a" })];
    expect(updateProjectRule(rules, "ghost", { title: "x" })).toEqual(rules);
  });
});

describe("removeProjectRule", () => {
  it("removes only the matching rule", () => {
    const rules = [makeRule({ id: "a" }), makeRule({ id: "b" })];
    expect(removeProjectRule(rules, "a").map((rule) => rule.id)).toEqual(["b"]);
    expect(removeProjectRule(rules, "ghost")).toEqual(rules);
  });
});

describe("normalizeProjectRules", () => {
  it("drops non-objects, id-less entries, and duplicates", () => {
    expect(
      normalizeProjectRules([
        makeRule({ id: "a" }),
        null,
        "nope",
        { id: "" },
        makeRule({ id: "a", title: "dup" }),
      ]).map((rule) => rule.id),
    ).toEqual(["a"]);
  });

  it("coerces shapes and caps the list", () => {
    const many = Array.from({ length: MAX_PROJECT_RULES + 5 }, (_, i) =>
      makeRule({ id: `r-${i}` }),
    );
    expect(normalizeProjectRules(many)).toHaveLength(MAX_PROJECT_RULES);
    expect(
      normalizeProjectRules([{ id: "x", title: 42, content: null, enabled: "yes" }]),
    ).toEqual([{ id: "x", title: "", content: "", enabled: true }]);
  });

  it("returns [] for non-arrays", () => {
    expect(normalizeProjectRules(undefined)).toEqual([]);
    expect(normalizeProjectRules("rules")).toEqual([]);
  });
});
