import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { PmeBudgetFormValues, PmeBudgetStatus } from "../pmeBudgetSchemas";
import { pmeBudgetClient } from "../services/pmeBudgetClient";
import { pmeBudgetKeys } from "./usePmeBudgets";

export function useSavePmeBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: PmeBudgetFormValues) => pmeBudgetClient.saveBudget(values),
    onSuccess: (budget) => {
      void queryClient.invalidateQueries({ queryKey: pmeBudgetKeys.all });
      queryClient.setQueryData(pmeBudgetKeys.detail(budget.id), budget);
    }
  });
}

export function useUpdatePmeBudgetStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PmeBudgetStatus }) =>
      pmeBudgetClient.updateStatus(id, status),
    onSuccess: (budget) => {
      void queryClient.invalidateQueries({ queryKey: pmeBudgetKeys.all });
      queryClient.setQueryData(pmeBudgetKeys.detail(budget.id), budget);
    }
  });
}
