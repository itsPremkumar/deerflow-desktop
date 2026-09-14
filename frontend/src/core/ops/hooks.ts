import { useQuery } from "@tanstack/react-query";

import { getOpsResources, getOpsStatus, getOpsVersion } from "./api";

export const OPS_STATUS_QUERY_KEY = ["ops", "status"] as const;
export const OPS_VERSION_QUERY_KEY = ["ops", "version"] as const;
export const OPS_RESOURCES_QUERY_KEY = ["ops", "resources"] as const;

export function useOpsStatus() {
  const query = useQuery({
    queryKey: OPS_STATUS_QUERY_KEY,
    queryFn: getOpsStatus,
    staleTime: 30_000,
    retry: false,
  });
  return { status: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

export function useOpsVersion() {
  const query = useQuery({
    queryKey: OPS_VERSION_QUERY_KEY,
    queryFn: getOpsVersion,
    staleTime: 5 * 60_000,
    retry: false,
  });
  return { version: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

export function useOpsResources() {
  const query = useQuery({
    queryKey: OPS_RESOURCES_QUERY_KEY,
    queryFn: getOpsResources,
    staleTime: 60_000,
    retry: false,
  });
  return { resources: query.data ?? null, isLoading: query.isLoading, error: query.error };
}
