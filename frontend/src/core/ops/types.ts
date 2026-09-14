export interface OpsStatus {
  service: string;
  status: string;
  uptime_seconds: number;
  time_utc: string;
  docs_enabled: boolean;
}

export interface OpsVersion {
  service: string;
  version: string;
}

export interface ResourceMemory {
  total_mb: number | null;
  available_mb: number | null;
}

export interface ResourceDisk {
  path: string;
  total_mb: number;
  free_mb: number;
}

export interface OpsResources {
  platform: string;
  cpu_count: number | null;
  memory: ResourceMemory;
  disk: ResourceDisk | null;
  load_average: number[] | null;
}
