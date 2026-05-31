import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG, type DealStatus } from "./deal-types";

export function StatusBadge({ status }: { status: DealStatus }) {
  const cfg = STATUS_CONFIG[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
