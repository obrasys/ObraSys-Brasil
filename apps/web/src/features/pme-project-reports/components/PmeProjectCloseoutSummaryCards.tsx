import type { PmeProjectCloseout } from "../pmeProjectReportTypes";

export function PmeProjectCloseoutSummaryCards({ closeout }: { closeout: PmeProjectCloseout }) {
  const result = closeout.result;
  return (
    <div className="summary-grid">
      <article className="summary-card">
        <span>Valor contratado</span>
        <strong>R$ {result.plannedRevenue}</strong>
      </article>
      <article className="summary-card">
        <span>Custo previsto</span>
        <strong>R$ {result.plannedCost}</strong>
      </article>
      <article className="summary-card">
        <span>Custo real pago</span>
        <strong>R$ {result.actualCost}</strong>
      </article>
      <article className="summary-card">
        <span>Recebido</span>
        <strong>R$ {result.receivedRevenue}</strong>
      </article>
      <article className="summary-card internal-summary">
        <span>Lucro previsto</span>
        <strong>R$ {result.expectedProfit}</strong>
      </article>
      <article className="summary-card internal-summary">
        <span>Lucro real</span>
        <strong>R$ {result.actualProfit}</strong>
      </article>
    </div>
  );
}
