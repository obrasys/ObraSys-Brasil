import {
  addDailyLogActivity,
  addDailyLogEquipment,
  addDailyLogLabor,
  addDailyLogMaterial,
  addDailyLogOccurrence,
  addDailyLogPhoto,
  addDailyLogVoiceNote,
  completePmeDailyLog,
  exportPmeDailyLog,
  fetchDailyLogWeather,
  getPmeDailyLog,
  listPmeDailyLogs,
  lockPmeDailyLog,
  saveManualDailyLogWeather,
  updatePmeDailyLog
} from "../pmeDailyLogRepository";
import type {
  PmeDailyLog,
  PmeDailyLogActivity,
  PmeDailyLogEquipment,
  PmeDailyLogLabor,
  PmeDailyLogMaterial,
  PmeDailyLogOccurrence,
  PmeDailyLogPhoto
} from "../pmeDailyLogTypes";

export const pmeDailyLogClient = {
  listDailyLogs: listPmeDailyLogs,
  getDailyLog: getPmeDailyLog,
  updateDailyLog: (projectId: string, dailyLog: PmeDailyLog) =>
    updatePmeDailyLog(projectId, dailyLog),
  saveManualWeather: saveManualDailyLogWeather,
  fetchWeather: fetchDailyLogWeather,
  addLabor: (projectId: string, item: Omit<PmeDailyLogLabor, "id">) =>
    addDailyLogLabor(projectId, item),
  addActivity: (projectId: string, item: Omit<PmeDailyLogActivity, "id">) =>
    addDailyLogActivity(projectId, item),
  addOccurrence: (projectId: string, item: Omit<PmeDailyLogOccurrence, "id">) =>
    addDailyLogOccurrence(projectId, item),
  addMaterial: (projectId: string, item: Omit<PmeDailyLogMaterial, "id">) =>
    addDailyLogMaterial(projectId, item),
  addEquipment: (projectId: string, item: Omit<PmeDailyLogEquipment, "id">) =>
    addDailyLogEquipment(projectId, item),
  addPhoto: (projectId: string, item: Omit<PmeDailyLogPhoto, "id">) =>
    addDailyLogPhoto(projectId, item),
  addVoiceNote: addDailyLogVoiceNote,
  completeDailyLog: completePmeDailyLog,
  lockDailyLog: lockPmeDailyLog,
  exportDailyLog: exportPmeDailyLog
};
