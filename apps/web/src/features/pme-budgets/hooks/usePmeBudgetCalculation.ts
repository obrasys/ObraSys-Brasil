import { useMutation } from "@tanstack/react-query";

import type { PmeBudgetFormValues } from "../pmeBudgetSchemas";
import type { PmeBudgetCalculationPreview } from "../pmeBudgetUiTypes";
import { calculatePmeBudgetPreview } from "../pmeBudgetRepository";
import { pmeBudgetClient } from "../services/pmeBudgetClient";

export function usePmeBudgetCalculation() {
  return useMutation({
    mutationFn: (values: PmeBudgetFormValues) => pmeBudgetClient.calculateBudget(values)
  });
}

export function getLocalPmeBudgetPreview(values: PmeBudgetFormValues): PmeBudgetCalculationPreview {
  return calculatePmeBudgetPreview(values);
}
