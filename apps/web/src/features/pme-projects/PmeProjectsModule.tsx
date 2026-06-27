import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { PmeProjectDashboardPage } from "./PmeProjectDashboardPage";
import { PmeProjectsListPage } from "./PmeProjectsListPage";

type PmeProjectRoute = { name: "list" } | { name: "detail"; projectId: string };

const listPath = "/app/obras";

export function PmeProjectsModule() {
  const queryClient = useMemo(() => new QueryClient(), []);
  const [route, setRoute] = useState<PmeProjectRoute>(() => parseRoute());

  useEffect(() => {
    function handlePopState() {
      setRoute(parseRoute());
    }

    globalThis.addEventListener("popstate", handlePopState);
    return () => globalThis.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(nextRoute: PmeProjectRoute) {
    const path = routeToPath(nextRoute);
    globalThis.history.pushState(null, "", path);
    setRoute(nextRoute);
  }

  return (
    <QueryClientProvider client={queryClient}>
      {route.name === "list" ? (
        <PmeProjectsListPage onOpen={(projectId) => navigate({ name: "detail", projectId })} />
      ) : null}
      {route.name === "detail" ? <PmeProjectDashboardPage projectId={route.projectId} /> : null}
    </QueryClientProvider>
  );
}

function parseRoute(): PmeProjectRoute {
  const pathname = globalThis.location.pathname;
  if (pathname.startsWith(`${listPath}/`)) {
    const projectId = pathname.slice(`${listPath}/`.length);
    if (projectId.length > 0) {
      return { name: "detail", projectId };
    }
  }

  if (pathname !== listPath) {
    globalThis.history.replaceState(null, "", listPath);
  }
  return { name: "list" };
}

function routeToPath(route: PmeProjectRoute): string {
  return route.name === "detail" ? `${listPath}/${route.projectId}` : listPath;
}
