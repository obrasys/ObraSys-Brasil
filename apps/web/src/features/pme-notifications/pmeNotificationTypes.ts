import type { PmeNotification, PmeNotificationPreference } from "@obrasys/domain";
import type { z } from "zod";

import type { pmeNotificationFiltersSchema } from "./pmeNotificationSchemas";

export type PmeNotificationFilters = z.infer<typeof pmeNotificationFiltersSchema>;

export interface PmeNotificationsViewModel {
  notifications: PmeNotification[];
  unreadCount: number;
  preferences: PmeNotificationPreference[];
  canSeeFinancials: boolean;
}

export interface PmeNotificationMutationResult {
  id: string;
}
