import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PmeSinapiAdaptationValues, PmeSinapiSearchValues } from "../pmeSinapiSchemas";
import { pmeBudgetClient } from "../services/pmeBudgetClient";
import { pmeBudgetKeys } from "./usePmeBudgets";

export const pmeSinapiKeys = {
  states: ["pme-budgets", "sinapi", "states"] as const,
  versions: ["pme-budgets", "sinapi", "versions"] as const,
  search: (values: PmeSinapiSearchValues) => ["pme-budgets", "sinapi", "search", values] as const,
  detail: (compositionId: string, versionId: string) =>
    ["pme-budgets", "sinapi", "detail", compositionId, versionId] as const
};

export function usePmeSinapiStates() {
  return useQuery({
    queryKey: pmeSinapiKeys.states,
    queryFn: pmeBudgetClient.listSinapiStates
  });
}

export function usePmeSinapiVersions() {
  return useQuery({
    queryKey: pmeSinapiKeys.versions,
    queryFn: pmeBudgetClient.listSinapiVersions
  });
}

export function usePmeSinapiSearch(values: PmeSinapiSearchValues) {
  return useQuery({
    queryKey: pmeSinapiKeys.search(values),
    queryFn: () => pmeBudgetClient.searchSinapiCompositions(values)
  });
}

export function usePmeSinapiCompositionDetails(compositionId: string, versionId: string) {
  return useQuery({
    queryKey: pmeSinapiKeys.detail(compositionId, versionId),
    queryFn: () => pmeBudgetClient.getSinapiCompositionDetails(compositionId, versionId),
    enabled: compositionId.length > 0 && versionId.length > 0
  });
}

export function useAddPmeSinapiCompositionToBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      budgetId: string;
      compositionId: string;
      versionId: string;
      adaptation: PmeSinapiAdaptationValues;
    }) => pmeBudgetClient.addSinapiCompositionToBudget(input),
    onSuccess: (budget) => {
      void queryClient.invalidateQueries({ queryKey: pmeBudgetKeys.all });
      queryClient.setQueryData(pmeBudgetKeys.detail(budget.id), budget);
    }
  });
}
