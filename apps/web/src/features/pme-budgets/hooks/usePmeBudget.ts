import { useQuery } from "@tanstack/react-query";

import { pmeBudgetClient } from "../services/pmeBudgetClient";
import type { PmeBudgetRecord } from "../pmeBudgetUiTypes";
import { pmeBudgetKeys } from "./usePmeBudgets";

export function usePmeBudget(id: string | null) {
  return useQuery<PmeBudgetRecord | null>({
    queryKey: pmeBudgetKeys.detail(id ?? "new"),
    queryFn: () => (id === null ? Promise.resolve(null) : pmeBudgetClient.getBudget(id)),
    enabled: id !== null
  });
}
