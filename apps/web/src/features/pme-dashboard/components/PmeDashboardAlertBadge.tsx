import type { PmeDashboardAlertSeverity } from "../pmeDashboardTypes";

export function PmeDashboardAlertBadge({ severity }: { severity: PmeDashboardAlertSeverity }) {
  const labels: Record<PmeDashboardAlertSeverity, string> = {
    low: "Baixo",
    medium: "Medio",
    high: "Alto",
    critical: "Critico"
  };
  return <span className={`status-pill dashboard-alert-${severity}`}>{labels[severity]}</span>;
}
