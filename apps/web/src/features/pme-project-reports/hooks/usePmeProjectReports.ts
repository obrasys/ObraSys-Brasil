import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { pmeProjectReportClient } from "../services/pmeProjectReportClient";
import type { GenerateReportInput } from "../pmeProjectReportTypes";

export const pmeProjectReportKeys = {
  all: ["pme-project-reports"] as const,
  project: (projectId: string) => [...pmeProjectReportKeys.all, projectId] as const,
  report: (projectId: string, reportId: string) =>
    [...pmeProjectReportKeys.project(projectId), "report", reportId] as const,
  closeout: (projectId: string) => [...pmeProjectReportKeys.project(projectId), "closeout"] as const
};

export function usePmeProjectReports(projectId: string) {
  return useQuery({
    queryKey: pmeProjectReportKeys.project(projectId),
    queryFn: () => pmeProjectReportClient.listReports(projectId)
  });
}

export function usePmeProjectReport(projectId: string, reportId: string) {
  return useQuery({
    queryKey: pmeProjectReportKeys.report(projectId, reportId),
    queryFn: () => pmeProjectReportClient.getReport(projectId, reportId)
  });
}

export function usePmeProjectCloseout(projectId: string) {
  return useQuery({
    queryKey: pmeProjectReportKeys.closeout(projectId),
    queryFn: () => pmeProjectReportClient.getCloseout(projectId)
  });
}

export function usePmeProjectReportMutations(projectId: string) {
  const queryClient = useQueryClient();
  const invalidateReports = () =>
    queryClient.invalidateQueries({ queryKey: pmeProjectReportKeys.project(projectId) });

  return {
    generateReport: useMutation({
      mutationFn: (input: GenerateReportInput) => pmeProjectReportClient.generateReport(input),
      onSuccess: invalidateReports
    }),
    exportReport: useMutation({
      mutationFn: (input: { reportId: string; exportType: "html" | "pdf" | "print_view" }) =>
        pmeProjectReportClient.exportReport(projectId, input.reportId, input.exportType)
    })
  };
}

export function usePmeProjectCloseoutMutations(projectId: string) {
  const queryClient = useQueryClient();
  const invalidateCloseout = () =>
    queryClient.invalidateQueries({ queryKey: pmeProjectReportKeys.closeout(projectId) });

  return {
    updateChecklist: useMutation({
      mutationFn: (input: {
        checklistItemId: string;
        status: "pending" | "completed" | "waived";
      }) => pmeProjectReportClient.updateChecklist(projectId, input.checklistItemId, input.status),
      onSuccess: invalidateCloseout
    }),
    closeProject: useMutation({
      mutationFn: (closeoutNotes: string) =>
        pmeProjectReportClient.closeProject(projectId, closeoutNotes),
      onSuccess: invalidateCloseout
    }),
    reopenProject: useMutation({
      mutationFn: (reason: string) => pmeProjectReportClient.reopenProject(projectId, reason),
      onSuccess: invalidateCloseout
    })
  };
}
