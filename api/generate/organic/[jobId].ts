import { getJob } from "../../_lib/jobs";
import { json, methodNotAllowed } from "../../_lib/http";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    methodNotAllowed(res, ["GET"]);
    return;
  }

  const jobId = String(req.query?.jobId ?? "");
  if (!jobId) {
    json(res, 400, { error: "jobId is required" });
    return;
  }

  const job = getJob(jobId);
  if (!job) {
    json(res, 404, { error: "Job not found" });
    return;
  }

  json(res, 200, job);
}
