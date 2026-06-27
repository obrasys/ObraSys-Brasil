import type { z } from "zod";

import type {
  pmeDailyLogActivitySchema,
  pmeDailyLogEquipmentSchema,
  pmeDailyLogLaborSchema,
  pmeDailyLogMaterialSchema,
  pmeDailyLogOccurrenceSchema,
  pmeDailyLogPhotoSchema,
  pmeDailyLogSchema,
  pmeDailyLogVoiceNoteSchema
} from "./pmeDailyLogSchemas";

export type PmeDailyLog = z.infer<typeof pmeDailyLogSchema>;
export type PmeDailyLogLabor = z.infer<typeof pmeDailyLogLaborSchema>;
export type PmeDailyLogActivity = z.infer<typeof pmeDailyLogActivitySchema>;
export type PmeDailyLogOccurrence = z.infer<typeof pmeDailyLogOccurrenceSchema>;
export type PmeDailyLogMaterial = z.infer<typeof pmeDailyLogMaterialSchema>;
export type PmeDailyLogEquipment = z.infer<typeof pmeDailyLogEquipmentSchema>;
export type PmeDailyLogPhoto = z.infer<typeof pmeDailyLogPhotoSchema>;
export type PmeDailyLogVoiceNote = z.infer<typeof pmeDailyLogVoiceNoteSchema>;

export interface PmeDailyLogSnapshot {
  projectId: string;
  projectName: string;
  dailyLog: PmeDailyLog;
  labor: PmeDailyLogLabor[];
  activities: PmeDailyLogActivity[];
  occurrences: PmeDailyLogOccurrence[];
  materials: PmeDailyLogMaterial[];
  equipment: PmeDailyLogEquipment[];
  photos: PmeDailyLogPhoto[];
  voiceNotes: PmeDailyLogVoiceNote[];
  axiaSuggestions: string[];
}
