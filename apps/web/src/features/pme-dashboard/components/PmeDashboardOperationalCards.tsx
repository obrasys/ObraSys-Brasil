import type { PmeDashboardSummary } from "@obrasys/domain";

export function PmeDashboardOperationalCards({ summary }: { summary: PmeDashboardSummary }) {
  return (
    <section aria-labelledby="dashboard-operational-title">
      <div className="section-heading">
        <div>
          <h2 id="dashboard-operational-title">Operacional</h2>
          <p>O que precisa de atencao nas obras em andamento.</p>
        </div>
      </div>
      <div className="dashboard-card-grid">
        <MetricCard label="Obras ativas" value={String(summary.activeProjects)} />
        <MetricCard label="Obras atrasadas" value={String(summary.delayedProjects)} />
        <MetricCard label="Tarefas abertas" value={String(summary.totalOpenTasks)} />
        <MetricCard label="Tarefas bloqueadas" value={String(summary.totalBlockedTasks)} />
        <MetricCard label="Compras atrasadas" value={String(summary.totalLatePurchases)} />
        <MetricCard label="Recebimentos vencidos" value={String(summary.totalOverdueReceipts)} />
        <MetricCard label="Diarios em falta" value={String(summary.totalMissingDailyLogs)} />
        <MetricCard label="Obras fechadas" value={String(summary.closedProjects)} />
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="dashboard-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
