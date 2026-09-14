import "katex/dist/katex.min.css";
import "streamdown/styles.css";

import { GatewayOfflineFallback } from "@/components/workspace/gateway-offline-fallback";
import { AuthProvider } from "@/core/auth/AuthProvider";
import { getServerSideUser } from "@/core/auth/server";
import { I18nProvider } from "@/core/i18n/context";
import { detectLocaleServer } from "@/core/i18n/server";

import { WorkspaceContent } from "./workspace-content";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await detectLocaleServer();
  const result = await getServerSideUser();

  let content: React.ReactNode;

  if (result.tag === "gateway_unavailable") {
    content = (
      <GatewayOfflineFallback>
        <WorkspaceContent gatewayUnavailable>{children}</WorkspaceContent>
      </GatewayOfflineFallback>
    );
  } else {
    const user = result.tag === "authenticated" ? result.user : null;
    content = (
      <AuthProvider initialUser={user}>
        <WorkspaceContent>{children}</WorkspaceContent>
      </AuthProvider>
    );
  }

  return <I18nProvider initialLocale={locale}>{content}</I18nProvider>;
}
