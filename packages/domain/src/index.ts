export const PRODUCT_NAME = "Obra Sys Brasil";

export type TenantId = string;
export type UserId = string;

export {
  calculatePmeBudget,
  type PmeBudgetCalculationInput,
  type PmeBudgetCalculationItemInput,
  type PmeBudgetCalculationItemResult,
  type PmeBudgetCalculationResult
} from "./pme/calculatePmeBudget";

export {
  assertPmeBudgetCanConvert,
  buildPmeBudgetConversionPlan,
  buildProjectInsertFromBudget,
  type ConvertiblePmeBudget,
  type ConvertiblePmeBudgetStatus,
  type ConvertiblePmeEnvironment,
  type ConvertiblePmeItem,
  type ConvertiblePmePaymentTerm,
  type PmeBudgetConversionPlan,
  type PmeProjectCostForecast,
  type PmeProjectReceivableForecast
} from "./pme/convertToProject";

export {
  buildPmeCatalogItemListQuery,
  createPmeCatalogItem,
  deactivatePmeCatalogItem,
  updatePmeCatalogItem,
  type PmeCatalogItemCreateInput,
  type PmeCatalogItemCreatePayload,
  type PmeCatalogItemDeactivateInput,
  type PmeCatalogItemListQuery,
  type PmeCatalogItemType,
  type PmeCatalogItemUpdateInput,
  type PmeCatalogItemUpdatePayload,
  type PmeCatalogJson,
  type PmeCatalogOrigin
} from "./pme/catalog";

export {
  SINAPI_DEMO_COMPOSITIONS,
  adaptSinapiComposition,
  createCatalogItemFromSinapi,
  createSinapiSnapshotPayload,
  hasMixedSinapiReference,
  searchSinapiCompositions,
  type SinapiAdaptationInput,
  type SinapiAdaptationResult,
  type SinapiCatalogItemPayload,
  type SinapiCompositionSearchInput,
  type SinapiCompositionSearchItem,
  type SinapiReference,
  type SinapiSavedSnapshotPayload,
  type SinapiSnapshotJson
} from "./sinapi/sinapi";

export {
  buildAxiaPmeAssistantResponse,
  sanitizeAxiaContext,
  sanitizeAxiaText,
  type AxiaInsightType,
  type AxiaJson,
  type AxiaPmeAssistantInput,
  type AxiaPmeAssistantResponse,
  type AxiaPmeBudgetContext,
  type AxiaPmeInsight,
  type AxiaPmeTask,
  type AxiaSanitizationResult,
  type AxiaSuggestionStatus
} from "./axia/pmeBudgetAssistant";
