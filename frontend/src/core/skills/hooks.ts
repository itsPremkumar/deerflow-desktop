import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { enableSkill, listSkillProposals, reviewSkillProposal, SkillRequestError, uploadSkillArchive } from "./api";

import { loadSkills } from ".";

export function useSkills() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["skills"],
    queryFn: () => loadSkills(),
    retry: (count, err) => !(err instanceof SkillRequestError) && count < 3,
  });
  return { skills: data ?? [], isLoading, error };
}

export function useEnableSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      skillName,
      enabled,
    }: {
      skillName: string;
      enabled: boolean;
    }) => {
      await enableSkill(skillName, enabled);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });
}

export function useUploadSkillArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadSkillArchive,
    onSuccess: (result) => {
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: ["skills"] });
      }
    },
  });
}

export function useSkillProposals(enabled = true) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["skill-proposals"],
    queryFn: () => listSkillProposals("all"),
    enabled,
    retry: (count, err) => !(err instanceof SkillRequestError) && count < 3,
  });
  return { proposals: data ?? [], isLoading, error };
}

export function useReviewSkillProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: "approve" | "reject";
      reason?: string;
    }) => {
      await reviewSkillProposal(id, action, reason);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["skill-proposals"] });
      void queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });
}
