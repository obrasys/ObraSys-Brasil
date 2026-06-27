import { useQuery } from "@tanstack/react-query";

import { pmeProjectClient } from "../services/pmeProjectClient";

export const pmeProjectKeys = {
  all: ["pme-projects"] as const,
  detail: (projectId: string) => [...pmeProjectKeys.all, projectId] as const
};

export function usePmeProjects() {
  return useQuery({
    queryKey: pmeProjectKeys.all,
    queryFn: pmeProjectClient.listProjects
  });
}

export function usePmeProject(projectId: string) {
  return useQuery({
    queryKey: pmeProjectKeys.detail(projectId),
    queryFn: () => pmeProjectClient.getProject(projectId)
  });
}
