import type { PmeNotificationSeverity } from "@obrasys/domain";

export function PmeNotificationSeverityBadge({ severity }: { severity: PmeNotificationSeverity }) {
  const labels: Record<PmeNotificationSeverity, string> = {
    info: "Info",
    low: "Baixo",
    medium: "Medio",
    high: "Alto",
    critical: "Critico"
  };
  return (
    <span className={`status-pill notification-severity-${severity}`}>{labels[severity]}</span>
  );
}
