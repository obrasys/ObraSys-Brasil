import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { PmeBudgetConversionValues } from "../pmeBudgetConversionSchemas";
import { pmeBudgetConversionClient } from "../services/pmeBudgetConversionClient";
import { pmeBudgetKeys } from "./usePmeBudgets";

export function usePmeBudgetConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: PmeBudgetConversionValues) =>
      pmeBudgetConversionClient.convertToProject(values),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: pmeBudgetKeys.all });
      void queryClient.invalidateQueries({ queryKey: pmeBudgetKeys.detail(result.budgetId) });
    }
  });
}
