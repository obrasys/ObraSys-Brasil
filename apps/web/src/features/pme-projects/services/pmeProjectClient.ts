import {
  createPmeProjectActualCost as createActualCost,
  createPmeProjectDailyLog as createDailyLog,
  createPmeProjectPurchase as createPurchase,
  createPmeProjectReceipt as createReceipt,
  createPmeProjectStage as createStage,
  createPmeProjectTask as createTask,
  getPmeProject,
  listPmeProjects,
  lockPmeProjectDailyLog as lockDailyLog,
  uploadPmeProjectPhoto as uploadPhoto
} from "../pmeProjectRepository";
import type {
  PmeProjectActualCost,
  PmeProjectDailyLog,
  PmeProjectPhoto,
  PmeProjectPurchase,
  PmeProjectReceipt,
  PmeProjectStage,
  PmeProjectTask
} from "../pmeProjectUiTypes";

export const pmeProjectClient = {
  listProjects: listPmeProjects,
  getProject: getPmeProject,
  createStage: (projectId: string, stage: Omit<PmeProjectStage, "id">) =>
    createStage(projectId, stage),
  createTask: (projectId: string, task: Omit<PmeProjectTask, "id">) => createTask(projectId, task),
  createPurchase: (projectId: string, purchase: Omit<PmeProjectPurchase, "id">) =>
    createPurchase(projectId, purchase),
  createActualCost: (projectId: string, cost: Omit<PmeProjectActualCost, "id">) =>
    createActualCost(projectId, cost),
  createReceipt: (projectId: string, receipt: Omit<PmeProjectReceipt, "id">) =>
    createReceipt(projectId, receipt),
  createDailyLog: (projectId: string, dailyLog: Omit<PmeProjectDailyLog, "id">) =>
    createDailyLog(projectId, dailyLog),
  lockDailyLog,
  uploadPhoto: (projectId: string, photo: Omit<PmeProjectPhoto, "id">) =>
    uploadPhoto(projectId, photo)
};
