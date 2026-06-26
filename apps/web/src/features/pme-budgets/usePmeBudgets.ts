import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getPmeBudget,
  listPmeBudgets,
  savePmeBudget,
  type PmeBudgetRecord,
  type PmeBudgetSummary
} from "./pmeBudgetRepository";
import type { PmeBudgetFormValues } from "./pmeBudgetSchemas";

const pmeBudgetKeys = {
  all: ["pme-budgets"] as const,
  detail: (id: string) => ["pme-budgets", id] as const
};

export function usePmeBudgets() {
  return useQuery<PmeBudgetSummary[]>({
    queryKey: pmeBudgetKeys.all,
    queryFn: listPmeBudgets
  });
}

export function usePmeBudget(id: string | null) {
  return useQuery<PmeBudgetRecord | null>({
    queryKey: pmeBudgetKeys.detail(id ?? "new"),
    queryFn: () => (id === null ? Promise.resolve(null) : getPmeBudget(id)),
    enabled: id !== null
  });
}

export function useSavePmeBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: PmeBudgetFormValues) => savePmeBudget(values),
    onSuccess: (budget) => {
      void queryClient.invalidateQueries({ queryKey: pmeBudgetKeys.all });
      void queryClient.setQueryData(pmeBudgetKeys.detail(budget.id), budget);
    }
  });
}
