import type { PmePurchaseSummary } from "../pmePurchaseTypes";

export function PmePurchaseSummaryCards({ summary }: { summary: PmePurchaseSummary }) {
  return (
    <div className="project-summary-grid" aria-label="Resumo de compras">
      <Card label="Previsto em compras" value={`R$ ${summary.expectedTotalAmount}`} />
      <Card
        label="Total comprado"
        tone={summary.isOverExpected ? "danger" : "neutral"}
        value={`R$ ${summary.totalPurchased}`}
      />
      <Card label="Total entregue" value={`R$ ${summary.totalDelivered}`} />
      <Card label="Total pago" value={`R$ ${summary.totalPaid}`} />
      <Card label="Compras pendentes" value={String(summary.pendingOrders)} />
      <Card
        label="Entregas atrasadas"
        tone={summary.delayedDeliveries > 0 ? "warning" : "neutral"}
        value={String(summary.delayedDeliveries)}
      />
    </div>
  );
}

function Card({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "danger";
}) {
  return (
    <div className={`project-summary-card summary-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
