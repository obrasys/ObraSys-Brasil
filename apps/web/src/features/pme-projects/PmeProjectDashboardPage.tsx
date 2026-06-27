import { useState } from "react";

import { usePmeProject } from "./hooks/usePmeProject";
import { PmeProjectCostsTab } from "./components/PmeProjectCostsTab";
import { PmeProjectDailyLogsTab } from "./components/PmeProjectDailyLogsTab";
import { PmeProjectFinancialSummaryCard } from "./components/PmeProjectFinancialSummaryCard";
import { PmeProjectPhotosTab } from "./components/PmeProjectPhotosTab";
import { PmeProjectProgressCard } from "./components/PmeProjectProgressCard";
import { PmeProjectPurchasesTab } from "./components/PmeProjectPurchasesTab";
import { PmeProjectReceiptsTab } from "./components/PmeProjectReceiptsTab";
import { PmeProjectSummaryCards } from "./components/PmeProjectSummaryCards";
import { PmeProjectTabs, type PmeProjectTab } from "./components/PmeProjectTabs";
import { PmeProjectTasksTab } from "./components/PmeProjectTasksTab";

export function PmeProjectDashboardPage({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<PmeProjectTab>("resumo");
  const projectQuery = usePmeProject(projectId);

  if (projectQuery.isLoading) {
    return <div className="state-box">Carregando obra...</div>;
  }

  if (projectQuery.isError || !projectQuery.data) {
    return <div className="state-box error-state">Nao foi possivel carregar esta obra.</div>;
  }

  const snapshot = projectQuery.data;

  return (
    <section className="module-section project-module" aria-labelledby="project-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Gestao da obra PME</p>
          <h1 id="project-title">{snapshot.project.name}</h1>
          <p className="muted">
            {snapshot.project.clientName} - {snapshot.project.workAddress}
          </p>
        </div>
        <span className="status-pill">{snapshot.project.status}</span>
      </div>

      <PmeProjectSummaryCards snapshot={snapshot} />

      {snapshot.financialSummary.hasCostOverrun ? (
        <div className="state-box error-state">
          O gasto real pago ultrapassou o custo previsto. Revise compras, mao de obra e proximos
          lancamentos.
        </div>
      ) : null}

      {snapshot.financialSummary.hasOverdueReceivables ? (
        <div className="state-box warning-state">
          Existem recebimentos vencidos. Confira a aba Recebimentos.
        </div>
      ) : null}

      {snapshot.tasks.some((task) => task.status === "blocked") ? (
        <div className="state-box warning-state">
          Ha tarefas bloqueadas na obra. Resolva os impedimentos para evitar atraso.
        </div>
      ) : null}

      <PmeProjectTabs currentTab={tab} onChange={setTab} />

      {tab === "resumo" ? (
        <div className="project-overview-grid">
          <PmeProjectProgressCard snapshot={snapshot} />
          <PmeProjectFinancialSummaryCard snapshot={snapshot} />
        </div>
      ) : null}
      {tab === "tarefas" ? <PmeProjectTasksTab snapshot={snapshot} /> : null}
      {tab === "compras" ? <PmeProjectPurchasesTab snapshot={snapshot} /> : null}
      {tab === "custos" ? <PmeProjectCostsTab snapshot={snapshot} /> : null}
      {tab === "recebimentos" ? <PmeProjectReceiptsTab snapshot={snapshot} /> : null}
      {tab === "diario" ? <PmeProjectDailyLogsTab snapshot={snapshot} /> : null}
      {tab === "fotos" ? <PmeProjectPhotosTab snapshot={snapshot} /> : null}
    </section>
  );
}
