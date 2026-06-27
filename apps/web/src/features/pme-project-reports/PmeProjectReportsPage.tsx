import { PmeProjectReportCard } from "./components/PmeProjectReportCard";
import { usePmeProjectReportMutations, usePmeProjectReports } from "./hooks/usePmeProjectReports";
import type { GenerateReportInput } from "./pmeProjectReportTypes";

const reportCards: Array<{
  title: string;
  description: string;
  reportType: GenerateReportInput["reportType"];
  visibility: GenerateReportInput["visibility"];
}> = [
  {
    title: "Financeiro interno",
    description: "Custo previsto, custo real, recebido, saldo e lucro.",
    reportType: "financial_summary",
    visibility: "management"
  },
  {
    title: "Operacional",
    description: "Tarefas, progresso, diarios, fotos e ocorrencias.",
    reportType: "operational_summary",
    visibility: "internal"
  },
  {
    title: "Compras e custos",
    description: "Compras abertas, compras entregues e custos lancados.",
    reportType: "purchases_summary",
    visibility: "internal"
  },
  {
    title: "Recebimentos",
    description: "Recebido, vencido e saldo a receber.",
    reportType: "receipts_summary",
    visibility: "internal"
  },
  {
    title: "Diario e fotos",
    description: "Registros de campo, fotos e observacoes operacionais.",
    reportType: "daily_logs_summary",
    visibility: "internal"
  },
  {
    title: "Relatorio para cliente",
    description: "Escopo executado, fotos e pendencias acordadas sem custo interno.",
    reportType: "client_delivery",
    visibility: "client"
  },
  {
    title: "Fecho interno",
    description: "Snapshot final com checklist e resultado da obra.",
    reportType: "closeout_internal",
    visibility: "management"
  }
];

export function PmeProjectReportsPage({ projectId }: { projectId: string }) {
  const reportsQuery = usePmeProjectReports(projectId);
  const mutations = usePmeProjectReportMutations(projectId);

  if (reportsQuery.isLoading) {
    return <div className="state-box">Carregando relatorios...</div>;
  }
  if (reportsQuery.isError || !reportsQuery.data) {
    return <div className="state-box error-state">Nao foi possivel carregar relatorios.</div>;
  }

  const snapshot = reportsQuery.data;

  return (
    <section className="module-section project-module" aria-labelledby="reports-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Relatorios PME</p>
          <h1 id="reports-title">Relatorios da obra</h1>
          <p className="muted">
            {snapshot.projectName} - separe versao interna da versao para cliente.
          </p>
        </div>
        <a className="secondary-button" href={`/app/obras/${projectId}/fecho`}>
          Ir para fecho
        </a>
      </div>

      <div className="state-box warning-state">
        Relatorios para cliente ocultam custo interno, margem, lucro, fornecedores internos e notas
        internas.
      </div>

      <div className="report-grid">
        {reportCards.map((card) => (
          <PmeProjectReportCard
            description={card.description}
            key={card.reportType}
            onExport={(reportId) => mutations.exportReport.mutate({ reportId, exportType: "html" })}
            onGenerate={(input) => mutations.generateReport.mutate(input)}
            projectId={projectId}
            report={snapshot.reports.find((report) => report.reportType === card.reportType)}
            reportType={card.reportType}
            title={card.title}
            visibility={card.visibility}
          />
        ))}
      </div>

      {mutations.exportReport.data ? (
        <section className="tab-panel">
          <h2>Previa imprimivel</h2>
          <pre className="report-preview">{mutations.exportReport.data.htmlSnapshot}</pre>
        </section>
      ) : null}
    </section>
  );
}
