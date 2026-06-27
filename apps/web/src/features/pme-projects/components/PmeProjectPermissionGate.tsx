import type { ReactNode } from "react";

interface PmeProjectPermissionGateProps {
  allowed: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PmeProjectPermissionGate({
  allowed,
  fallback = null,
  children
}: PmeProjectPermissionGateProps) {
  return allowed ? <>{children}</> : <>{fallback}</>;
}
