import { type JobView } from "@/lib/go-api/jobs";

export { isFinished, toJobView, type JobView } from "@/lib/go-api/jobs";

export type StartResult =
  | { readonly status: "ok"; readonly job: JobView }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string };
