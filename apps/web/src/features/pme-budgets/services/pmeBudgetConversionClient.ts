import type {
  PmeBudgetConversionResult,
  PmeBudgetConversionValues
} from "../pmeBudgetConversionSchemas";
import { pmeBudgetClient } from "./pmeBudgetClient";

export const pmeBudgetConversionClient = {
  convertToProject(input: PmeBudgetConversionValues): Promise<PmeBudgetConversionResult> {
    return pmeBudgetClient.convertToProject(input);
  }
};
