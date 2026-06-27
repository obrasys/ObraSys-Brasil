import {
  calculatePmeBudgetOfficial,
  addPmeSinapiCompositionToBudget,
  convertPmeBudgetToProject,
  getPmeBudget,
  getPmeSinapiCompositionDetails,
  listPmeSinapiStates,
  listPmeSinapiVersions,
  listPmeBudgets,
  savePmeBudget,
  searchPmeCatalogEntries,
  searchPmeSinapiCompositions,
  updatePmeBudgetStatus
} from "../pmeBudgetRepository";

export const pmeBudgetClient = {
  listBudgets: listPmeBudgets,
  getBudget: getPmeBudget,
  saveBudget: savePmeBudget,
  updateStatus: updatePmeBudgetStatus,
  calculateBudget: calculatePmeBudgetOfficial,
  searchCatalog: searchPmeCatalogEntries,
  listSinapiStates: listPmeSinapiStates,
  listSinapiVersions: listPmeSinapiVersions,
  searchSinapiCompositions: searchPmeSinapiCompositions,
  getSinapiCompositionDetails: getPmeSinapiCompositionDetails,
  addSinapiCompositionToBudget: addPmeSinapiCompositionToBudget,
  convertToProject: convertPmeBudgetToProject
};
