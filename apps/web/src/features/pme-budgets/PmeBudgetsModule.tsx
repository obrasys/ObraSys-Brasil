import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { PmeBudgetEditorPage } from "./PmeBudgetEditorPage";
import { PmeBudgetListPage } from "./PmeBudgetListPage";

type PmeBudgetRoute =
  | { name: "list" }
  | { name: "new" }
  | {
      name: "edit";
      id: string;
    };

const listPath = "/pme/orcamentos";
const newPath = "/pme/orcamentos/novo";

export function PmeBudgetsModule() {
  const queryClient = useMemo(() => new QueryClient(), []);
  const [route, setRoute] = useState<PmeBudgetRoute>(() => parseRoute());

  useEffect(() => {
    function handlePopState() {
      setRoute(parseRoute());
    }

    globalThis.addEventListener("popstate", handlePopState);
    return () => globalThis.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(nextRoute: PmeBudgetRoute) {
    const path = routeToPath(nextRoute);
    globalThis.history.pushState(null, "", path);
    setRoute(nextRoute);
  }

  return (
    <QueryClientProvider client={queryClient}>
      {route.name === "list" ? (
        <PmeBudgetListPage
          onCreate={() => navigate({ name: "new" })}
          onEdit={(id) => navigate({ name: "edit", id })}
        />
      ) : null}

      {route.name === "new" ? (
        <PmeBudgetEditorPage
          budgetId={null}
          onBack={() => navigate({ name: "list" })}
          onSaved={(id) => navigate({ name: "edit", id })}
        />
      ) : null}

      {route.name === "edit" ? (
        <PmeBudgetEditorPage
          budgetId={route.id}
          onBack={() => navigate({ name: "list" })}
          onSaved={(id) => navigate({ name: "edit", id })}
        />
      ) : null}
    </QueryClientProvider>
  );
}

function parseRoute(): PmeBudgetRoute {
  const pathname = globalThis.location.pathname;

  if (pathname === newPath) {
    return { name: "new" };
  }

  if (pathname.startsWith(`${listPath}/`)) {
    const id = pathname.slice(`${listPath}/`.length);
    return id.length > 0 ? { name: "edit", id } : { name: "list" };
  }

  if (pathname !== listPath) {
    globalThis.history.replaceState(null, "", listPath);
  }

  return { name: "list" };
}

function routeToPath(route: PmeBudgetRoute): string {
  if (route.name === "new") {
    return newPath;
  }

  if (route.name === "edit") {
    return `${listPath}/${route.id}`;
  }

  return listPath;
}
