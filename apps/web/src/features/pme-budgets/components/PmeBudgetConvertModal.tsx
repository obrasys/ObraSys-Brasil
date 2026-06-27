import { useState } from "react";

import {
  pmeBudgetConversionSchema,
  type PmeBudgetConversionValues
} from "../pmeBudgetConversionSchemas";
import type { PmeBudgetRecord } from "../pmeBudgetUiTypes";

interface PmeBudgetConvertModalProps {
  budget: PmeBudgetRecord;
  isSubmitting: boolean;
  errorMessage?: string | undefined;
  onCancel: () => void;
  onConfirm: (values: PmeBudgetConversionValues) => void;
}

export function PmeBudgetConvertModal({
  budget,
  isSubmitting,
  errorMessage,
  onCancel,
  onConfirm
}: PmeBudgetConvertModalProps) {
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  function handleConfirm() {
    const parsed = pmeBudgetConversionSchema.safeParse({
      budgetId: budget.id,
      confirmed: true
    });

    if (!parsed.success) {
      setValidationMessage(parsed.error.issues[0]?.message ?? "Revise os dados da conversão.");
      return;
    }

    setValidationMessage(null);
    onConfirm(parsed.data);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        aria-labelledby="pme-budget-convert-title"
        aria-modal="true"
        className="modal-panel"
        role="dialog"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Converter orçamento</p>
            <h2 id="pme-budget-convert-title">Converter orçamento em obra?</h2>
          </div>
        </div>

        <p className="modal-copy">
          Esta ação criará uma obra a partir do orçamento aprovado, preservando os valores, itens,
          materiais, mão de obra, condições de pagamento e snapshots do SINAPI. Depois da conversão,
          este orçamento ficará vinculado à obra criada.
        </p>

        <div className="details-grid compact-details">
          <Detail label="Cliente" value={budget.clientName} />
          <Detail label="Título" value={budget.title} />
          <Detail label="Valor final" value={`R$ ${budget.finalPrice}`} />
          <Detail label="Custo previsto" value={`R$ ${budget.subtotalCost}`} />
          <Detail label="Itens" value={`${budget.items.length}`} />
          <Detail label="Ambientes" value={`${budget.environments.length}`} />
          <Detail label="Pagamento" value={`${budget.paymentTerms.length || 1} condição(ões)`} />
          <Detail label="Validade" value={budget.validUntil || "Sem validade"} />
        </div>

        <div className="notice-box">
          A obra será criada com uma base congelada do orçamento aprovado. Atualizações futuras do
          SINAPI ou do catálogo não alteram esse snapshot.
        </div>

        {validationMessage ? (
          <div className="state-box error-state">{validationMessage}</div>
        ) : null}
        {errorMessage ? <div className="state-box error-state">{errorMessage}</div> : null}

        <div className="modal-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
          >
            {isSubmitting ? "Convertendo..." : "Converter em obra"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
