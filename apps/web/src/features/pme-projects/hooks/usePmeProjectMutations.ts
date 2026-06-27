import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  PmeProjectActualCost,
  PmeProjectDailyLog,
  PmeProjectPhoto,
  PmeProjectPurchase,
  PmeProjectReceipt,
  PmeProjectStage,
  PmeProjectTask
} from "../pmeProjectUiTypes";
import { pmeProjectClient } from "../services/pmeProjectClient";
import { pmeProjectKeys } from "./usePmeProject";

export function useCreatePmeProjectStage(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stage: Omit<PmeProjectStage, "id">) =>
      pmeProjectClient.createStage(projectId, stage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pmeProjectKeys.detail(projectId) })
  });
}

export function useCreatePmeProjectTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (task: Omit<PmeProjectTask, "id">) => pmeProjectClient.createTask(projectId, task),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pmeProjectKeys.detail(projectId) })
  });
}

export function useCreatePmeProjectPurchase(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (purchase: Omit<PmeProjectPurchase, "id">) =>
      pmeProjectClient.createPurchase(projectId, purchase),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pmeProjectKeys.detail(projectId) })
  });
}

export function useCreatePmeProjectActualCost(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cost: Omit<PmeProjectActualCost, "id">) =>
      pmeProjectClient.createActualCost(projectId, cost),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pmeProjectKeys.detail(projectId) })
  });
}

export function useCreatePmeProjectReceipt(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (receipt: Omit<PmeProjectReceipt, "id">) =>
      pmeProjectClient.createReceipt(projectId, receipt),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pmeProjectKeys.detail(projectId) })
  });
}

export function useCreatePmeProjectDailyLog(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dailyLog: Omit<PmeProjectDailyLog, "id">) =>
      pmeProjectClient.createDailyLog(projectId, dailyLog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pmeProjectKeys.detail(projectId) })
  });
}

export function useLockPmeProjectDailyLog(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dailyLogId: string) => pmeProjectClient.lockDailyLog(projectId, dailyLogId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pmeProjectKeys.detail(projectId) })
  });
}

export function useUploadPmeProjectPhoto(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photo: Omit<PmeProjectPhoto, "id">) =>
      pmeProjectClient.uploadPhoto(projectId, photo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pmeProjectKeys.detail(projectId) })
  });
}
