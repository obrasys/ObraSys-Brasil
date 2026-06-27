import {
  closePmeProject,
  exportPmeProjectReport,
  generatePmeProjectReport,
  getPmeProjectCloseout,
  getPmeProjectReportById,
  listPmeProjectReports,
  reopenPmeProject,
  updatePmeProjectCloseoutChecklist
} from "../pmeProjectReportRepository";

export const pmeProjectReportClient = {
  listReports: listPmeProjectReports,
  getReport: getPmeProjectReportById,
  generateReport: generatePmeProjectReport,
  exportReport: exportPmeProjectReport,
  getCloseout: getPmeProjectCloseout,
  updateChecklist: updatePmeProjectCloseoutChecklist,
  closeProject: closePmeProject,
  reopenProject: reopenPmeProject
};
