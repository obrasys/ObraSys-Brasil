import type { ReactNode } from "react";

interface Props {
  canSeeFinancials: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PmeDashboardPermissionGate({ canSeeFinancials, children, fallback }: Props) {
  if (!canSeeFinancials) {
    return fallback ?? <span className="muted">Oculto para este perfil</span>;
  }
  return <>{children}</>;
}
