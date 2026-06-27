import { PmeProjectCloseoutPage } from "./PmeProjectCloseoutPage";
import { PmeProjectReportsPage } from "./PmeProjectReportsPage";

export function PmeProjectReportsModule() {
  const pathname = globalThis.location.pathname;
  const projectId = pathname.split("/")[3] ?? "project-demo-1";

  if (pathname.endsWith("/fecho") || pathname.includes("/fecho/")) {
    return <PmeProjectCloseoutPage projectId={projectId} />;
  }

  return <PmeProjectReportsPage projectId={projectId} />;
}
