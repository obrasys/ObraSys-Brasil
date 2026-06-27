import type { PmeBudgetStatus } from "../pmeBudgetSchemas";
import { statusLabels } from "../pmeBudgetLabels";

export function PmeBudgetStatusBadge({ status }: { status: PmeBudgetStatus }) {
  return <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>;
}
