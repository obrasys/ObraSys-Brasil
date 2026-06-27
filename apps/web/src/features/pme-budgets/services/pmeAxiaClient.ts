import { runPmeAxiaAssistant } from "../pmeBudgetRepository";
import {
  pmeAxiaRequestSchema,
  pmeAxiaResponseSchema,
  type PmeAxiaRequestValues,
  type PmeAxiaResponse
} from "../pmeAxiaSchemas";

export const pmeAxiaClient = {
  async runAssistant(input: PmeAxiaRequestValues): Promise<PmeAxiaResponse> {
    const payload = pmeAxiaRequestSchema.parse(input);
    const response = await runPmeAxiaAssistant(payload);
    return pmeAxiaResponseSchema.parse(response);
  }
};
