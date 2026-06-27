import { compareProjectSupplierQuotes } from "../pmePurchaseRepository";
import type { PmeSupplierQuote } from "../pmePurchaseTypes";

export function PmeSupplierQuoteComparison({
  quotes,
  onSelect
}: {
  quotes: PmeSupplierQuote[];
  onSelect: (quoteId: string) => void;
}) {
  const comparison = compareProjectSupplierQuotes(quotes);

  return (
    <div className="simple-list" aria-label="Comparacao de cotacoes">
      {comparison.map((quote) => (
        <article className="simple-list-row" key={quote.id}>
          <div>
            <strong>{quote.supplierNameSnapshot}</strong>
            <p>
              {quote.isBestPrice ? "Melhor preco. " : ""}
              {quote.isFastestDelivery ? "Menor prazo. " : ""}
              {quote.isExpired ? "Cotacao vencida." : (quote.paymentTerms ?? "Sem condicao")}
            </p>
          </div>
          <span>R$ {quote.finalAmount}</span>
          <span>{quote.deliveryDeadline ?? "Sem prazo"}</span>
          <button
            className="secondary-button"
            disabled={quote.isSelected}
            onClick={() => onSelect(quote.id)}
            type="button"
          >
            {quote.isSelected ? "Selecionada" : "Selecionar"}
          </button>
        </article>
      ))}
    </div>
  );
}
