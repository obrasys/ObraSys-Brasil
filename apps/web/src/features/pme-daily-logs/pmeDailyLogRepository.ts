import {
  buildDailyLogVoiceSuggestion,
  generateDailyLogReportHtml,
  validatePmeDailyLogCompletion
} from "@obrasys/domain";

import type {
  PmeDailyLog,
  PmeDailyLogActivity,
  PmeDailyLogEquipment,
  PmeDailyLogLabor,
  PmeDailyLogMaterial,
  PmeDailyLogOccurrence,
  PmeDailyLogPhoto,
  PmeDailyLogSnapshot,
  PmeDailyLogVoiceNote
} from "./pmeDailyLogTypes";

const snapshot: PmeDailyLogSnapshot = {
  projectId: "project-demo-1",
  projectName: "Reforma do apartamento - Cliente Silva",
  dailyLog: {
    id: "daily-log-1",
    logDate: "2026-06-27",
    status: "draft",
    weatherSource: "manual",
    weatherSummary: "Manha com sol, tarde nublada.",
    workPerformed: "Preparacao do banheiro e revisao de pontos hidraulicos.",
    nextSteps: "Finalizar impermeabilizacao.",
    clientNotes: "",
    voiceSummary: ""
  },
  labor: [{ id: "labor-1", workerType: "pedreiro", quantity: "1", workerName: "Carlos" }],
  activities: [
    {
      id: "activity-1",
      title: "Preparacao do banheiro",
      description: "Protecao do local e revisao dos pontos.",
      progressPercentage: "40",
      status: "in_progress"
    }
  ],
  occurrences: [],
  materials: [],
  equipment: [],
  photos: [
    {
      id: "photo-1",
      fileUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=640",
      fileName: "banheiro.jpg",
      caption: "Banheiro em preparacao"
    }
  ],
  voiceNotes: [],
  axiaSuggestions: []
};

export async function listPmeDailyLogs(projectId: string): Promise<PmeDailyLog[]> {
  ensureProject(projectId);
  return [structuredClone(snapshot.dailyLog)];
}

export async function getPmeDailyLog(
  projectId: string,
  dailyLogId: string
): Promise<PmeDailyLogSnapshot> {
  ensureProject(projectId);
  if (dailyLogId !== snapshot.dailyLog.id) {
    throw new Error("Diario nao encontrado.");
  }
  return structuredClone(snapshot);
}

export async function updatePmeDailyLog(projectId: string, dailyLog: PmeDailyLog): Promise<void> {
  ensureProject(projectId);
  assertEditable();
  snapshot.dailyLog = dailyLog;
}

export async function saveManualDailyLogWeather(projectId: string, summary: string): Promise<void> {
  ensureProject(projectId);
  assertEditable();
  snapshot.dailyLog.weatherSource = "manual";
  snapshot.dailyLog.weatherSummary = summary;
}

export async function fetchDailyLogWeather(projectId: string): Promise<void> {
  ensureProject(projectId);
  assertEditable();
  snapshot.dailyLog.weatherSource = "manual";
  snapshot.dailyLog.weatherSummary = "Fallback manual: informe o clima observado no canteiro.";
}

export async function addDailyLogLabor(projectId: string, item: Omit<PmeDailyLogLabor, "id">) {
  ensureProject(projectId);
  assertEditable();
  snapshot.labor.push({ ...item, id: createId("labor") });
}

export async function addDailyLogActivity(
  projectId: string,
  item: Omit<PmeDailyLogActivity, "id">
) {
  ensureProject(projectId);
  assertEditable();
  snapshot.activities.push({ ...item, id: createId("activity") });
}

export async function addDailyLogOccurrence(
  projectId: string,
  item: Omit<PmeDailyLogOccurrence, "id">
) {
  ensureProject(projectId);
  assertEditable();
  snapshot.occurrences.push({ ...item, id: createId("occurrence") });
}

export async function addDailyLogMaterial(
  projectId: string,
  item: Omit<PmeDailyLogMaterial, "id">
) {
  ensureProject(projectId);
  assertEditable();
  snapshot.materials.push({ ...item, id: createId("material") });
}

export async function addDailyLogEquipment(
  projectId: string,
  item: Omit<PmeDailyLogEquipment, "id">
) {
  ensureProject(projectId);
  assertEditable();
  snapshot.equipment.push({ ...item, id: createId("equipment") });
}

export async function addDailyLogPhoto(projectId: string, item: Omit<PmeDailyLogPhoto, "id">) {
  ensureProject(projectId);
  snapshot.photos.push({ ...item, id: createId("photo") });
}

export async function addDailyLogVoiceNote(projectId: string, transcriptText: string) {
  ensureProject(projectId);
  assertEditable();
  const suggestion = buildDailyLogVoiceSuggestion(transcriptText);
  const voiceNote: PmeDailyLogVoiceNote = {
    id: createId("voice"),
    transcriptText,
    processingStatus: "completed"
  };
  snapshot.voiceNotes.push(voiceNote);
  snapshot.axiaSuggestions = [
    ...suggestion.warnings,
    `${suggestion.activities.length} atividade(s) sugerida(s) para revisao humana.`
  ];
  snapshot.dailyLog.voiceSummary = transcriptText;
}

export async function completePmeDailyLog(projectId: string): Promise<string[]> {
  ensureProject(projectId);
  const result = validatePmeDailyLogCompletion({
    logDate: snapshot.dailyLog.logDate,
    workPerformed: snapshot.dailyLog.workPerformed ?? "",
    activitiesCount: snapshot.activities.length,
    laborCount: snapshot.labor.reduce((total, item) => total + Number(item.quantity), 0),
    laborEntriesCount: snapshot.labor.length,
    weatherSource: snapshot.dailyLog.weatherSource ?? null,
    createdBy: "user-demo"
  });
  if (!result.canComplete) {
    return result.missingFields;
  }
  snapshot.dailyLog.status = "completed";
  return [];
}

export async function lockPmeDailyLog(projectId: string): Promise<void> {
  ensureProject(projectId);
  snapshot.dailyLog.status = "locked";
}

export async function exportPmeDailyLog(projectId: string): Promise<string> {
  ensureProject(projectId);
  return generateDailyLogReportHtml({
    companyName: "Obra Sys Brasil",
    projectName: snapshot.projectName,
    logDate: snapshot.dailyLog.logDate,
    status: snapshot.dailyLog.status,
    weatherSummary: snapshot.dailyLog.weatherSummary ?? "",
    laborSummary: `${snapshot.labor.length} registro(s) de equipe`,
    activities: snapshot.activities.map((item) => item.description),
    occurrences: snapshot.occurrences.map((item) => item.description),
    materials: snapshot.materials.map(
      (item) => `${item.materialName} ${item.quantity} ${item.unit}`
    ),
    equipment: snapshot.equipment.map((item) => `${item.equipmentName} ${item.quantity}`),
    photos: snapshot.photos.map((photo) => ({
      fileUrl: photo.fileUrl,
      caption: photo.caption ?? photo.fileName
    })),
    nextSteps: snapshot.dailyLog.nextSteps ?? "",
    clientNotes: snapshot.dailyLog.clientNotes ?? "",
    responsibleName: "Equipe da obra"
  });
}

function ensureProject(projectId: string): void {
  if (projectId !== snapshot.projectId) {
    throw new Error("Obra nao encontrada.");
  }
}

function assertEditable(): void {
  if (snapshot.dailyLog.status === "locked") {
    throw new Error("Diario bloqueado nao pode ser editado.");
  }
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}
