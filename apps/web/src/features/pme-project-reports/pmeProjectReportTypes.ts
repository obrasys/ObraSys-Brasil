import type {
  PmeProjectCloseoutResult,
  PmeProjectReportSnapshot,
  PmeProjectReportType,
  PmeProjectReportVisibility
} from "@obrasys/domain";
import type { z } from "zod";

import type {
  pmeProjectCloseoutChecklistItemSchema,
  pmeProjectReportSettingsSchema
} from "./pmeProjectReportSchemas";

export type PmeProjectReportSettings = z.infer<typeof pmeProjectReportSettingsSchema>;
export type PmeProjectCloseoutChecklistItem = z.infer<typeof pmeProjectCloseoutChecklistItemSchema>;

export interface PmeProjectReport {
  id: string;
  reportType: PmeProjectReportType;
  title: string;
  description?: string;
  visibility: PmeProjectReportVisibility;
  dataSnapshot: PmeProjectReportSnapshot;
  generatedAt: string;
}

export interface PmeProjectReportExport {
  id: string;
  reportId: string;
  exportType: "html" | "pdf" | "print_view";
  htmlSnapshot?: string;
  fileUrl?: string;
  generatedAt: string;
}

export interface PmeProjectCloseout {
  id: string;
  status: "draft" | "ready_to_close" | "closed" | "reopened" | "cancelled";
  result: PmeProjectCloseoutResult;
  checklist: PmeProjectCloseoutChecklistItem[];
  warnings: string[];
  blockingReasons: string[];
  closeoutNotes?: string;
  closedAt?: string;
  reopenedAt?: string;
}

export interface PmeProjectReportsSnapshot {
  projectId: string;
  projectName: string;
  clientName: string;
  canSeeProfit: boolean;
  reports: PmeProjectReport[];
  settings: PmeProjectReportSettings;
}

export interface PmeProjectCloseoutSnapshot {
  projectId: string;
  projectName: string;
  clientName: string;
  canSeeProfit: boolean;
  closeout: PmeProjectCloseout;
}

export interface GenerateReportInput {
  projectId: string;
  reportType: PmeProjectReportType;
  visibility: PmeProjectReportVisibility;
}
