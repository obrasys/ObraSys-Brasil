import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { PmeBudgetCreatePage } from "./PmeBudgetCreatePage";
import { PmeBudgetEditPage } from "./PmeBudgetEditPage";
import { PmeBudgetListPage } from "./PmeBudgetListPage";
import { PmeBudgetViewPage } from "./PmeBudgetViewPage";

type PmeBudgetRoute =
  | { name: "list" }
  | { name: "new" }
  | {
      name: "view";
      id: string;
    }
  | {
      name: "edit";
      id: string;
    };

const listPath = "/app/orcamentos-pme";
const newPath = "/app/orcamentos-pme/novo";

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
          onView={(id) => navigate({ name: "view", id })}
          onEdit={(id) => navigate({ name: "edit", id })}
        />
      ) : null}

      {route.name === "new" ? (
        <PmeBudgetCreatePage
          onBack={() => navigate({ name: "list" })}
          onCreated={(id) => navigate({ name: "edit", id })}
        />
      ) : null}

      {route.name === "view" ? (
        <PmeBudgetViewPage
          budgetId={route.id}
          onBack={() => navigate({ name: "list" })}
          onEdit={(id) => navigate({ name: "edit", id })}
        />
      ) : null}

      {route.name === "edit" ? (
        <PmeBudgetEditPage
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
    const suffix = pathname.slice(`${listPath}/`.length);
    const editSuffix = suffix.endsWith("/editar");
    const id = editSuffix ? suffix.slice(0, -"/editar".length) : suffix;

    if (id.length > 0) {
      return editSuffix ? { name: "edit", id } : { name: "view", id };
    }
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

  if (route.name === "view") {
    return `${listPath}/${route.id}`;
  }

  if (route.name === "edit") {
    return `${listPath}/${route.id}/editar`;
  }

  return listPath;
}
