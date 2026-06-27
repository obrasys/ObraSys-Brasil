import type { PmeProjectSnapshot } from "../pmeProjectUiTypes";
import { PmeProjectPermissionGate } from "./PmeProjectPermissionGate";

export function PmeProjectFinancialSummaryCard({ snapshot }: { snapshot: PmeProjectSnapshot }) {
  const summary = snapshot.financialSummary;

  return (
    <section className="tab-panel" aria-labelledby="project-financial-title">
      <div className="section-heading">
        <div>
          <h2 id="project-financial-title">Previsto vs. realizado</h2>
          <p>Resumo financeiro calculado pelo servico centralizado da obra PME.</p>
        </div>
      </div>
      <div className="financial-lines">
        <Line label="Custo previsto" value={`R$ ${summary.plannedCost}`} />
        <Line label="Custo realizado pago" value={`R$ ${summary.actualCost}`} />
        <Line label="Receita prevista" value={`R$ ${summary.plannedRevenue}`} />
        <Line label="Receita recebida" value={`R$ ${summary.receivedRevenue}`} />
        <Line label="Recebiveis pendentes" value={`R$ ${summary.pendingReceivables}`} />
        <PmeProjectPermissionGate
          allowed={snapshot.canSeeProfit}
          fallback={<p className="muted">Lucro e margem ficam ocultos para este perfil.</p>}
        >
          <Line label="Lucro previsto" value={`R$ ${summary.expectedProfit}`} />
          <Line label="Lucro real" value={`R$ ${summary.actualProfit}`} />
          <Line label="Variacao de lucro" value={`R$ ${summary.profitVariance}`} />
          <Line label="Variacao de custo" value={`R$ ${summary.costVariance}`} />
        </PmeProjectPermissionGate>
      </div>
    </section>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="financial-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
