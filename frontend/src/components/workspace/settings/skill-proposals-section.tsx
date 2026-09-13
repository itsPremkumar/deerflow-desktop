"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { useAuth } from "@/core/auth/AuthProvider";
import { useI18n } from "@/core/i18n/hooks";
import { formatSkillSecurityFindings, SkillRequestError } from "@/core/skills/api";
import type { SkillProposal } from "@/core/skills/api";
import { useReviewSkillProposal, useSkillProposals } from "@/core/skills/hooks";
import { env } from "@/env";

import { SettingsSection } from "./settings-section";

function statusLabel(
  status: SkillProposal["status"],
  t: ReturnType<typeof useI18n>["t"],
): string {
  switch (status) {
    case "pending":
      return t.settings.skills.proposalStatusPending;
    case "approved":
      return t.settings.skills.proposalStatusApproved;
    case "rejected":
      return t.settings.skills.proposalStatusRejected;
    case "installed":
      return t.settings.skills.proposalStatusInstalled;
  }
}

function ProposalCard({ proposal }: { proposal: SkillProposal }) {
  const { t } = useI18n();
  const { mutateAsync: review, isPending } = useReviewSkillProposal();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const handleReview = async (action: "approve" | "reject") => {
    try {
      await review({ id: proposal.id, action, reason });
      toast.success(
        action === "approve"
          ? t.settings.skills.proposalApproved
          : t.settings.skills.proposalRejected,
      );
      setRejecting(false);
      setReason("");
    } catch (error) {
      if (error instanceof SkillRequestError && error.isAdminRequired) {
        toast.error(t.settings.skills.adminRequired);
      } else if (
        error instanceof SkillRequestError &&
        error.findings.length > 0
      ) {
        toast.error(error.message, {
          description: (
            <span className="whitespace-pre-line">
              {formatSkillSecurityFindings(error.findings)}
            </span>
          ),
        });
      } else {
        toast.error(
          error instanceof Error
            ? error.message
            : t.settings.skills.proposalReviewFailed,
        );
      }
    }
  };

  const findingCounts = Object.entries(proposal.findings_summary ?? {})
    .filter(([, count]) => count > 0)
    .map(([severity, count]) => `${count} ${severity}`)
    .join(", ");

  return (
    <Item className="w-full" variant="outline">
      <ItemContent>
        <ItemTitle>
          <div className="flex items-center gap-2">
            {proposal.name}
            <Badge variant="secondary">{statusLabel(proposal.status, t)}</Badge>
          </div>
        </ItemTitle>
        <ItemDescription className="line-clamp-4">
          {proposal.description || proposal.id}
        </ItemDescription>
        {findingCounts && (
          <ItemDescription>Findings: {findingCounts}</ItemDescription>
        )}
        {proposal.status === "rejected" && proposal.reject_reason && (
          <ItemDescription>{proposal.reject_reason}</ItemDescription>
        )}
      </ItemContent>
      {proposal.status === "pending" && (
        <ItemActions>
          {!rejecting ? (
            <>
              <Button
                size="sm"
                disabled={isPending}
                onClick={() => void handleReview("approve")}
              >
                {t.settings.skills.proposalApprove}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => setRejecting(true)}
              >
                {t.settings.skills.proposalReject}
              </Button>
            </>
          ) : (
            <>
              <Input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t.settings.skills.proposalRejectReason}
                className="w-48"
                maxLength={2000}
              />
              <Button
                size="sm"
                variant="destructive"
                disabled={isPending}
                onClick={() => void handleReview("reject")}
              >
                {t.settings.skills.proposalRejectConfirm}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => {
                  setRejecting(false);
                  setReason("");
                }}
              >
                {t.settings.skills.proposalCancel}
              </Button>
            </>
          )}
        </ItemActions>
      )}
    </Item>
  );
}

export function SkillProposalsSection() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { proposals, isLoading, error } = useSkillProposals(user?.system_role === "admin");

  if (user?.system_role !== "admin") return null;
  if (env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true") return null;

  return (
    <SettingsSection
      title={t.settings.skills.proposalsTitle}
      description={t.settings.skills.proposalsDescription}
    >
      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t.common.loading}</div>
      ) : error ? (
        <div>
          {t.common.error}{" "}
          {error instanceof Error
            ? error.message
            : t.settings.skills.proposalReviewFailed}
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-muted-foreground text-sm">
          {t.settings.skills.proposalsEmpty}
        </div>
      ) : (
        <div className="flex w-full flex-col gap-4">
          {proposals.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
