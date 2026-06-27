import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { PmeDailyLogsPage } from "./PmeDailyLogsPage";
import { PmeDailyLogWizard } from "./PmeDailyLogWizard";

type DailyLogRoute =
  | { name: "list"; projectId: string }
  | { name: "detail"; projectId: string; dailyLogId: string };

export function PmeDailyLogsModule() {
  const queryClient = useMemo(() => new QueryClient(), []);
  const [route, setRoute] = useState<DailyLogRoute>(() => parseRoute());

  function openDailyLog(projectId: string, dailyLogId: string) {
    globalThis.history.pushState(null, "", `/app/obras/${projectId}/diario/${dailyLogId}/editar`);
    setRoute({ name: "detail", projectId, dailyLogId });
  }

  return (
    <QueryClientProvider client={queryClient}>
      {route.name === "list" ? (
        <PmeDailyLogsPage
          onOpen={(dailyLogId) => openDailyLog(route.projectId, dailyLogId)}
          projectId={route.projectId}
        />
      ) : (
        <PmeDailyLogWizard dailyLogId={route.dailyLogId} projectId={route.projectId} />
      )}
    </QueryClientProvider>
  );
}

function parseRoute(): DailyLogRoute {
  const match = globalThis.location.pathname.match(/^\/app\/obras\/([^/]+)\/diario(?:\/([^/]+))?/);
  const projectId = match?.[1] ?? "project-demo-1";
  const dailyLogId = match?.[2];
  return dailyLogId ? { name: "detail", projectId, dailyLogId } : { name: "list", projectId };
}
