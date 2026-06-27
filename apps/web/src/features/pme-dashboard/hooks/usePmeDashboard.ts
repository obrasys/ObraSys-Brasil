import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { pmeDashboardClient } from "../services/pmeDashboardClient";
import type {
  PmeDashboardAlertUpdateInput,
  PmeDashboardFilters,
  PmeDashboardPreferences
} from "../pmeDashboardTypes";

export const pmeDashboardKeys = {
  all: ["pme-dashboard"] as const,
  summary: (filters: PmeDashboardFilters) => [...pmeDashboardKeys.all, "summary", filters] as const,
  alerts: (filters: PmeDashboardFilters) => [...pmeDashboardKeys.all, "alerts", filters] as const
};

export function usePmeDashboardSummary(filters: PmeDashboardFilters) {
  return useQuery({
    queryKey: pmeDashboardKeys.summary(filters),
    queryFn: () => pmeDashboardClient.getSummary(filters)
  });
}

export function usePmeDashboardAlerts(filters: PmeDashboardFilters) {
  return useQuery({
    queryKey: pmeDashboardKeys.alerts(filters),
    queryFn: () => pmeDashboardClient.getAlerts(filters)
  });
}

export function usePmeDashboardMutations(filters: PmeDashboardFilters) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: pmeDashboardKeys.all });

  return {
    generateAlerts: useMutation({
      mutationFn: () => pmeDashboardClient.generateAlerts(filters),
      onSuccess: invalidate
    }),
    acknowledgeAlert: useMutation({
      mutationFn: (input: PmeDashboardAlertUpdateInput) =>
        pmeDashboardClient.acknowledgeAlert(input),
      onSuccess: invalidate
    }),
    resolveAlert: useMutation({
      mutationFn: (input: PmeDashboardAlertUpdateInput) => pmeDashboardClient.resolveAlert(input),
      onSuccess: invalidate
    }),
    savePreferences: useMutation({
      mutationFn: (preferences: PmeDashboardPreferences) =>
        pmeDashboardClient.savePreferences(preferences),
      onSuccess: invalidate
    })
  };
}
