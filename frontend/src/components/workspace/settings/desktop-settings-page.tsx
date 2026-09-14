"use client";

import { Switch } from "@/components/ui/switch";
import { useAutoStart, useDesktopApp, useSetAutoStart } from "@/core/desktop";
import { useI18n } from "@/core/i18n/hooks";

import { SettingsSection } from "./settings-section";

export function DesktopSettingsPage() {
  const { t } = useI18n();
  const desktop = useDesktopApp();
  const { state, isLoading } = useAutoStart();
  const setAutoStart = useSetAutoStart();

  if (!desktop) {
    return (
      <SettingsSection
        title={t.settings.desktop.title}
        description={t.settings.desktop.description}
      >
        <p className="text-muted-foreground text-sm">
          {t.settings.desktop.browserOnly}
        </p>
      </SettingsSection>
    );
  }

  const checked = state?.active ?? state?.enabled ?? false;

  return (
    <SettingsSection
      title={t.settings.desktop.title}
      description={
        <div className="flex items-center gap-2">
          <div>{t.settings.desktop.description}</div>
          <div>
            <Switch
              aria-label={t.settings.desktop.autoStart}
              disabled={isLoading || setAutoStart.isPending || !state?.supported}
              checked={checked}
              onCheckedChange={(enabled) => setAutoStart.mutate(enabled)}
            />
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">
          {t.settings.desktop.autoStartHint}
        </p>
        {!state?.supported && (
          <p className="text-muted-foreground text-sm">
            {t.settings.desktop.installedOnly}
          </p>
        )}
        {setAutoStart.isError && (
          <p className="text-destructive text-sm">
            {t.settings.desktop.updateFailed}
          </p>
        )}
      </div>
    </SettingsSection>
  );
}
