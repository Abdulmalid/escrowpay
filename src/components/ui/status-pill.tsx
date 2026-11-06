import { Badge } from "./badge";

const MILESTONE_TONE: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  draft: "neutral",
  pending_funding: "warning",
  funded: "info",
  in_progress: "info",
  submitted: "warning",
  under_review: "warning",
  approved: "success",
  release_pending: "warning",
  released: "success",
  disputed: "danger",
  cancelled: "neutral",
  pending: "warning",
  confirmed: "success",
  failed: "danger",
  expired: "neutral",
  requested: "warning",
  processing: "info",
  completed: "success",
  open: "danger",
  resolved: "success",
  rejected: "neutral",
  active: "info",
  READY: "success",
  NEEDS_WORK: "danger",
  UNCERTAIN: "warning",
};

export function StatusPill({ status }: { status: string }) {
  const tone = MILESTONE_TONE[status] ?? "neutral";
  return <Badge variant={tone}>{status.replace(/_/g, " ")}</Badge>;
}
