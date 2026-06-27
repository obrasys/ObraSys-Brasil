import { useMutation } from "@tanstack/react-query";

import type { PmeAxiaRequestValues } from "../pmeAxiaSchemas";
import { pmeAxiaClient } from "../services/pmeAxiaClient";

export function usePmeAxiaAssistant() {
  return useMutation({
    mutationFn: (values: PmeAxiaRequestValues) => pmeAxiaClient.runAssistant(values)
  });
}
