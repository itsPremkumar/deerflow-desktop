"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/core/i18n/hooks";
import {
  createProjectRule,
  removeProjectRule,
  updateProjectRule,
  type ProjectRule,
} from "@/core/rules";
import { useLocalSettings } from "@/core/settings/hooks";

import { SettingsSection } from "./settings-section";

function RuleCard({
  rule,
  onChange,
  onRemove,
}: {
  rule: ProjectRule;
  onChange: (patch: Partial<Pick<ProjectRule, "title" | "content" | "enabled">>) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  return (
    <Item className="w-full" variant="outline">
      <ItemContent>
        <Input
          value={rule.title}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder={t.settings.rules.ruleTitlePlaceholder}
          aria-label={t.settings.rules.ruleTitlePlaceholder}
          maxLength={120}
        />
        <Textarea
          value={rule.content}
          onChange={(event) => onChange({ content: event.target.value })}
          placeholder={t.settings.rules.ruleContentPlaceholder}
          aria-label={t.settings.rules.ruleContentPlaceholder}
          rows={3}
          maxLength={4000}
        />
      </ItemContent>
      <ItemActions>
        <Switch
          checked={rule.enabled}
          onCheckedChange={(checked) => onChange({ enabled: checked })}
          aria-label={t.settings.rules.ruleEnabled}
        />
        <Button size="sm" variant="ghost" onClick={onRemove}>
          {t.settings.rules.deleteRule}
        </Button>
      </ItemActions>
    </Item>
  );
}

export function RulesSettingsPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useLocalSettings();
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const rules = settings.projectRules.rules;

  const persist = (next: ProjectRule[]) => {
    setSettings("projectRules", { rules: next });
  };

  const handleAdd = () => {
    if (!draftTitle.trim() && !draftContent.trim()) {
      toast.error(t.settings.rules.emptyRule);
      return;
    }
    persist([...rules, createProjectRule(draftTitle.trim(), draftContent)]);
    setDraftTitle("");
    setDraftContent("");
  };

  return (
    <SettingsSection
      title={t.settings.rules.title}
      description={t.settings.rules.description}
    >
      <div className="flex w-full flex-col gap-4">
        {rules.length === 0 ? (
          <ItemDescription>{t.settings.rules.empty}</ItemDescription>
        ) : (
          rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onChange={(patch) =>
                persist(updateProjectRule(rules, rule.id, patch))
              }
              onRemove={() => persist(removeProjectRule(rules, rule.id))}
            />
          ))
        )}
        <Item className="w-full" variant="outline">
          <ItemContent>
            <ItemTitle>{t.settings.rules.addRule}</ItemTitle>
            <Input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder={t.settings.rules.ruleTitlePlaceholder}
              aria-label={t.settings.rules.ruleTitlePlaceholder}
              maxLength={120}
            />
            <Textarea
              value={draftContent}
              onChange={(event) => setDraftContent(event.target.value)}
              placeholder={t.settings.rules.ruleContentPlaceholder}
              aria-label={t.settings.rules.ruleContentPlaceholder}
              rows={3}
              maxLength={4000}
            />
          </ItemContent>
          <ItemActions>
            <Button size="sm" onClick={handleAdd}>
              {t.settings.rules.addRule}
            </Button>
          </ItemActions>
        </Item>
      </div>
    </SettingsSection>
  );
}
