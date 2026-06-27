import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { pmeNotificationClient } from "../services/pmeNotificationClient";
import type { PmeNotificationFilters } from "../pmeNotificationTypes";
import type { PmeNotificationPreference } from "@obrasys/domain";

export const pmeNotificationKeys = {
  all: ["pme-notifications"] as const,
  list: (filters: PmeNotificationFilters) => [...pmeNotificationKeys.all, "list", filters] as const,
  unread: () => [...pmeNotificationKeys.all, "unread"] as const,
  preferences: () => [...pmeNotificationKeys.all, "preferences"] as const
};

export function usePmeNotifications(filters: PmeNotificationFilters) {
  return useQuery({
    queryKey: pmeNotificationKeys.list(filters),
    queryFn: () => pmeNotificationClient.getNotifications(filters)
  });
}

export function useUnreadPmeNotificationsCount() {
  return useQuery({
    queryKey: pmeNotificationKeys.unread(),
    queryFn: pmeNotificationClient.getUnreadCount
  });
}

export function usePmeNotificationPreferences() {
  return useQuery({
    queryKey: pmeNotificationKeys.preferences(),
    queryFn: pmeNotificationClient.getPreferences
  });
}

export function usePmeNotificationMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: pmeNotificationKeys.all });

  return {
    generate: useMutation({
      mutationFn: pmeNotificationClient.generate,
      onSuccess: invalidate
    }),
    markAsRead: useMutation({
      mutationFn: pmeNotificationClient.markAsRead,
      onSuccess: invalidate
    }),
    resolve: useMutation({
      mutationFn: pmeNotificationClient.markAsResolved,
      onSuccess: invalidate
    }),
    archive: useMutation({
      mutationFn: pmeNotificationClient.archive,
      onSuccess: invalidate
    }),
    dismiss: useMutation({
      mutationFn: pmeNotificationClient.dismiss,
      onSuccess: invalidate
    }),
    updatePreferences: useMutation({
      mutationFn: (preferences: PmeNotificationPreference[]) =>
        pmeNotificationClient.updatePreferences(preferences),
      onSuccess: invalidate
    })
  };
}
