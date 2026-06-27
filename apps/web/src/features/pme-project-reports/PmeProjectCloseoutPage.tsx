import { useState } from "react";

import { PmeProjectCloseoutChecklist } from "./components/PmeProjectCloseoutChecklist";
import { PmeProjectCloseoutSummaryCards } from "./components/PmeProjectCloseoutSummaryCards";
import { PmeProjectCloseoutWarnings } from "./components/PmeProjectCloseoutWarnings";
import {
  usePmeProjectCloseout,
  usePmeProjectCloseoutMutations
} from "./hooks/usePmeProjectReports";

export function PmeProjectCloseoutPage({ projectId }: { projectId: string }) {
  const [notes, setNotes] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const closeoutQuery = usePmeProjectCloseout(projectId);
  const mutations = usePmeProjectCloseoutMutations(projectId);

  if (closeoutQuery.isLoading) {
    return <div className="state-box">Carregando fecho da obra...</div>;
  }
  if (closeoutQuery.isError || !closeoutQuery.data) {
    return <div className="state-box error-state">Nao foi possivel carregar o fecho.</div>;
  }

  const snapshot = closeoutQuery.data;
  const closeout = snapshot.closeout;
  const hasPendencies = closeout.warnings.length > 0 || closeout.blockingReasons.length > 0;

  return (
    <section className="module-section project-module" aria-labelledby="closeout-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Fecho simples da obra</p>
          <h1 id="closeout-title">{snapshot.projectName}</h1>
          <p className="muted">
            Confira o resultado, registre pendencias e guarde o snapshot final da obra.
          </p>
        </div>
        <span className="status-pill">{closeout.status}</span>
      </div>

      <PmeProjectCloseoutSummaryCards closeout={closeout} />
      <PmeProjectCloseoutWarnings closeout={closeout} />

      <div className="project-overview-grid">
        <section className="tab-panel">
          <h2>Resumo operacional</h2>
          <div className="metric-list">
            <span>Progresso: {closeout.result.progressPercentage}%</span>
            <span>Tarefas concluidas: {closeout.result.completedTasksCount}</span>
            <span>Tarefas pendentes: {closeout.result.pendingTasksCount}</span>
            <span>Compras abertas: {closeout.result.openPurchasesCount}</span>
            <span>Recebimentos vencidos: {closeout.result.overdueReceiptsCount}</span>
          </div>
        </section>
        <section className="tab-panel">
          <h2>Relatorio para cliente</h2>
          <p className="muted">
            A versao do cliente nao mostra custo interno, margem, lucro, fornecedores internos ou
            notas internas.
          </p>
          <a className="secondary-button" href={`/app/obras/${projectId}/relatorios`}>
            Gerar relatorios
          </a>
        </section>
      </div>

      <PmeProjectCloseoutChecklist
        closeout={closeout}
        onChange={(checklistItemId, status) =>
          mutations.updateChecklist.mutate({ checklistItemId, status })
        }
      />

      <section className="tab-panel" aria-labelledby="closeout-notes-title">
        <h2 id="closeout-notes-title">Notas de fecho</h2>
        <textarea
          onChange={(event) => setNotes(event.target.value)}
          placeholder={
            hasPendencies
              ? "Explique por que a obra pode ser fechada mesmo com pendencias."
              : "Observacoes finais da obra."
          }
          rows={4}
          value={notes}
        />
        <div className="row-actions">
          <button
            className="primary-button"
            disabled={closeout.status === "closed" || mutations.closeProject.isPending}
            onClick={() => mutations.closeProject.mutate(notes)}
            type="button"
          >
            Fechar obra
          </button>
          <button
            className="secondary-button"
            disabled={closeout.status !== "closed"}
            onClick={() => mutations.reopenProject.mutate(reopenReason)}
            type="button"
          >
            Reabrir obra
          </button>
          <input
            aria-label="Motivo da reabertura"
            onChange={(event) => setReopenReason(event.target.value)}
            placeholder="Motivo da reabertura"
            value={reopenReason}
          />
        </div>
        {mutations.closeProject.isError ? (
          <p className="form-error">Nao foi possivel fechar: informe justificativa e checklist.</p>
        ) : null}
        {mutations.reopenProject.isError ? (
          <p className="form-error">Informe o motivo da reabertura.</p>
        ) : null}
      </section>
    </section>
  );
}
