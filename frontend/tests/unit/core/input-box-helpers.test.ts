import { describe, expect, it } from "@rstest/core";

import {
  getMatchingSkillSuggestions,
  KEYWORD_COMMAND_ALIASES,
  type SlashSuggestion,
} from "@/components/workspace/input-box-helpers";

const BUILTINS: SlashSuggestion[] = [
  { name: "compact", description: "Compact the conversation", kind: "builtin" },
  { name: "goal", description: "Manage the session goal", kind: "builtin" },
];

function builtinNames(query: string): string[] {
  return getMatchingSkillSuggestions([], query, BUILTINS).map(
    (suggestion) => suggestion.name,
  );
}

describe("KEYWORD_COMMAND_ALIASES", () => {
  it("routes intent keywords to their builtin command", () => {
    expect(builtinNames("compress")).toContain("compact");
    expect(builtinNames("summarize")).toContain("compact");
    expect(builtinNames("context")).toContain("compact");
    expect(builtinNames("objective")).toContain("goal");
    expect(builtinNames("goals")).toContain("goal");
  });

  it("is case-insensitive like the name matcher", () => {
    expect(builtinNames("COMPRESS")).toContain("compact");
  });

  it("does not match unrelated queries", () => {
    expect(builtinNames("zxqv")).not.toContain("compact");
    expect(builtinNames("zxqv")).not.toContain("goal");
  });

  it("only targets known builtin names", () => {
    for (const target of Object.values(KEYWORD_COMMAND_ALIASES)) {
      expect(BUILTINS.map(({ name }) => name)).toContain(target);
    }
  });
});
