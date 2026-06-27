import type { PmeBudgetCalculationPreview } from "../pmeBudgetUiTypes";

interface PmeBudgetTotalsCardProps {
  preview: PmeBudgetCalculationPreview;
  officialPreview?: PmeBudgetCalculationPreview | undefined;
  isCalculating?: boolean;
}

export function PmeBudgetTotalsCard({
  preview,
  officialPreview,
  isCalculating = false
}: PmeBudgetTotalsCardProps) {
  const hasDivergence =
    typeof officialPreview !== "undefined" && officialPreview.finalPrice !== preview.finalPrice;

  return (
    <aside className="summary-rail" aria-label="Resumo financeiro">
      <strong>Totais internos</strong>
      <Metric label="Custo interno" value={`R$ ${preview.subtotalCost}`} tone="internal" />
      <Metric label="Subtotal venda" value={`R$ ${preview.subtotalPrice}`} tone="sale" />
      <Metric label="Impostos" value={`R$ ${preview.taxAmount}`} />
      <Metric label="Lucro previsto" value={`R$ ${preview.profitAmount}`} tone="internal" />
      <Metric label="Preço final" value={`R$ ${preview.finalPrice}`} tone="sale" />
      {isCalculating ? <div className="state-box compact-state">Recalculando...</div> : null}
      {hasDivergence ? (
        <div className="notice-box">
          A prévia local divergiu do cálculo oficial. Confira os valores antes de enviar.
        </div>
      ) : null}
      <div className="client-preview">
        <strong>Visão do cliente</strong>
        <p>Exibe serviços, condições e preço de venda. Não mostra custo nem margem interna.</p>
      </div>
    </aside>
  );
}

function Metric({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone?: "internal" | "sale";
}) {
  return (
    <div className={tone ? `metric ${tone}` : "metric"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
