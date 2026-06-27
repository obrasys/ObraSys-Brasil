import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";

import { PmeProjectPurchasesPage } from "./PmeProjectPurchasesPage";
import { PmeSuppliersListPage } from "./PmeSuppliersListPage";

export function PmePurchasesModule() {
  const queryClient = useMemo(() => new QueryClient(), []);
  const pathname = globalThis.location.pathname;
  const projectMatch = pathname.match(/^\/app\/obras\/([^/]+)\/compras/);

  return (
    <QueryClientProvider client={queryClient}>
      {projectMatch ? (
        <PmeProjectPurchasesPage projectId={projectMatch[1] ?? "project-demo-1"} />
      ) : (
        <PmeSuppliersListPage />
      )}
    </QueryClientProvider>
  );
}
