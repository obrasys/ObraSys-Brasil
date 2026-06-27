import {
  acknowledgePmeDashboardAlert,
  generatePmeDashboardAlerts,
  getPmeDashboardAlerts,
  getPmeDashboardSummary,
  resolvePmeDashboardAlert,
  savePmeDashboardPreferences
} from "../pmeDashboardRepository";

export const pmeDashboardClient = {
  getSummary: getPmeDashboardSummary,
  getAlerts: getPmeDashboardAlerts,
  generateAlerts: generatePmeDashboardAlerts,
  acknowledgeAlert: acknowledgePmeDashboardAlert,
  resolveAlert: resolvePmeDashboardAlert,
  savePreferences: savePmeDashboardPreferences
};
