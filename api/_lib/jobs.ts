import type { OrganicGenerationResponse } from "../../src/agent/types";

const jobs = new Map<string, OrganicGenerationResponse>();

export function saveJob(job: OrganicGenerationResponse): OrganicGenerationResponse {
  jobs.set(job.jobId, job);
  return job;
}

export function getJob(jobId: string): OrganicGenerationResponse | undefined {
  return jobs.get(jobId);
}

export function createJobId(prefix = "org"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
