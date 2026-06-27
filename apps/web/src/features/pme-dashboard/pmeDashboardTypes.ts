import type {
  PmeDashboardAlert,
  PmeDashboardAlertSeverity,
  PmeDashboardPeriod,
  PmeDashboardResult
} from "@obrasys/domain";
import type { z } from "zod";

import type {
  pmeDashboardFiltersSchema,
  pmeDashboardPreferencesSchema
} from "./pmeDashboardSchemas";

export type PmeDashboardFilters = z.infer<typeof pmeDashboardFiltersSchema>;
export type PmeDashboardPreferences = z.infer<typeof pmeDashboardPreferencesSchema>;

export interface PmeDashboardViewModel extends PmeDashboardResult {
  canSeeFinancials: boolean;
  preferences: PmeDashboardPreferences;
}

export interface PmeDashboardMutationResult {
  id: string;
}

export interface PmeDashboardAlertUpdateInput {
  alertId: string;
  status: "acknowledged" | "resolved" | "archived";
}

export interface PmeDashboardFilterOption {
  label: string;
  value: string;
}

export type { PmeDashboardAlert, PmeDashboardAlertSeverity, PmeDashboardPeriod };
