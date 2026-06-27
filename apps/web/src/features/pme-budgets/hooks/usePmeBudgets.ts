import { useQuery } from "@tanstack/react-query";

import { pmeBudgetClient } from "../services/pmeBudgetClient";
import type { PmeBudgetFilters, PmeBudgetSummary } from "../pmeBudgetUiTypes";

export const pmeBudgetKeys = {
  all: ["pme-budgets"] as const,
  list: (filters: PmeBudgetFilters) => ["pme-budgets", "list", filters] as const,
  detail: (id: string) => ["pme-budgets", "detail", id] as const,
  catalog: (query: string, category: string, type: string, includeInactive: boolean) =>
    ["pme-budgets", "catalog", query, category, type, includeInactive] as const
};

export function usePmeBudgets(filters: PmeBudgetFilters) {
  return useQuery<PmeBudgetSummary[]>({
    queryKey: pmeBudgetKeys.list(filters),
    queryFn: () => pmeBudgetClient.listBudgets(filters)
  });
}
