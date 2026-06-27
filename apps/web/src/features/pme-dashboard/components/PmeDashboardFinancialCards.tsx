import type { PmeDashboardSummary } from "@obrasys/domain";

import { PmeDashboardPermissionGate } from "./PmeDashboardPermissionGate";

interface Props {
  canSeeFinancials: boolean;
  summary: PmeDashboardSummary;
}

export function PmeDashboardFinancialCards({ canSeeFinancials, summary }: Props) {
  return (
    <section aria-labelledby="dashboard-financial-title">
      <div className="section-heading">
        <div>
          <h2 id="dashboard-financial-title">Financeiro consolidado</h2>
          <p>Valores das obras filtradas. Custo e lucro aparecem apenas para perfis autorizados.</p>
        </div>
      </div>
      <div className="dashboard-card-grid">
        <MetricCard label="Valor contratado" value={`R$ ${summary.totalPlannedRevenue}`} />
        <MetricCard label="Recebido" value={`R$ ${summary.totalReceivedRevenue}`} />
        <MetricCard label="Saldo a receber" value={`R$ ${summary.totalPendingReceivables}`} />
        <PmeDashboardPermissionGate canSeeFinancials={canSeeFinancials}>
          <MetricCard internal label="Custo previsto" value={`R$ ${summary.totalPlannedCost}`} />
          <MetricCard internal label="Custo realizado" value={`R$ ${summary.totalActualCost}`} />
          <MetricCard internal label="Lucro previsto" value={`R$ ${summary.totalExpectedProfit}`} />
          <MetricCard internal label="Lucro real" value={`R$ ${summary.totalActualProfit}`} />
          <MetricCard internal label="Desvio de custo" value={`R$ ${summary.totalCostVariance}`} />
        </PmeDashboardPermissionGate>
      </div>
    </section>
  );
}

function MetricCard({
  internal,
  label,
  value
}: {
  internal?: boolean;
  label: string;
  value: string;
}) {
  return (
    <article className={`dashboard-card ${internal ? "internal-summary" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
