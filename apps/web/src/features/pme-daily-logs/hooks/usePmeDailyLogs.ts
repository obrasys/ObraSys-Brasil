import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  PmeDailyLogActivity,
  PmeDailyLogEquipment,
  PmeDailyLogLabor,
  PmeDailyLogMaterial,
  PmeDailyLogOccurrence,
  PmeDailyLogPhoto
} from "../pmeDailyLogTypes";
import { pmeDailyLogClient } from "../services/pmeDailyLogClient";

export const pmeDailyLogKeys = {
  list: (projectId: string) => ["pme-daily-logs", projectId] as const,
  detail: (projectId: string, dailyLogId: string) =>
    ["pme-daily-logs", projectId, dailyLogId] as const
};

export function usePmeDailyLogs(projectId: string) {
  return useQuery({
    queryKey: pmeDailyLogKeys.list(projectId),
    queryFn: () => pmeDailyLogClient.listDailyLogs(projectId)
  });
}

export function usePmeDailyLog(projectId: string, dailyLogId: string) {
  return useQuery({
    queryKey: pmeDailyLogKeys.detail(projectId, dailyLogId),
    queryFn: () => pmeDailyLogClient.getDailyLog(projectId, dailyLogId)
  });
}

export function usePmeDailyLogMutations(projectId: string, dailyLogId: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: pmeDailyLogKeys.detail(projectId, dailyLogId) });

  return {
    saveManualWeather: useMutation({
      mutationFn: (summary: string) => pmeDailyLogClient.saveManualWeather(projectId, summary),
      onSuccess: invalidate
    }),
    fetchWeather: useMutation({
      mutationFn: () => pmeDailyLogClient.fetchWeather(projectId),
      onSuccess: invalidate
    }),
    addLabor: useMutation({
      mutationFn: (item: Omit<PmeDailyLogLabor, "id">) =>
        pmeDailyLogClient.addLabor(projectId, item),
      onSuccess: invalidate
    }),
    addActivity: useMutation({
      mutationFn: (item: Omit<PmeDailyLogActivity, "id">) =>
        pmeDailyLogClient.addActivity(projectId, item),
      onSuccess: invalidate
    }),
    addOccurrence: useMutation({
      mutationFn: (item: Omit<PmeDailyLogOccurrence, "id">) =>
        pmeDailyLogClient.addOccurrence(projectId, item),
      onSuccess: invalidate
    }),
    addMaterial: useMutation({
      mutationFn: (item: Omit<PmeDailyLogMaterial, "id">) =>
        pmeDailyLogClient.addMaterial(projectId, item),
      onSuccess: invalidate
    }),
    addEquipment: useMutation({
      mutationFn: (item: Omit<PmeDailyLogEquipment, "id">) =>
        pmeDailyLogClient.addEquipment(projectId, item),
      onSuccess: invalidate
    }),
    addPhoto: useMutation({
      mutationFn: (item: Omit<PmeDailyLogPhoto, "id">) =>
        pmeDailyLogClient.addPhoto(projectId, item),
      onSuccess: invalidate
    }),
    addVoiceNote: useMutation({
      mutationFn: (transcriptText: string) =>
        pmeDailyLogClient.addVoiceNote(projectId, transcriptText),
      onSuccess: invalidate
    }),
    complete: useMutation({
      mutationFn: () => pmeDailyLogClient.completeDailyLog(projectId),
      onSuccess: invalidate
    }),
    lock: useMutation({
      mutationFn: () => pmeDailyLogClient.lockDailyLog(projectId),
      onSuccess: invalidate
    }),
    exportReport: useMutation({
      mutationFn: () => pmeDailyLogClient.exportDailyLog(projectId)
    })
  };
}
