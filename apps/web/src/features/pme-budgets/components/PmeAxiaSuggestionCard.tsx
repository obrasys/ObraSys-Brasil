import { useState } from "react";

import type { PmeAxiaSuggestion, PmeAxiaSuggestionItem } from "../pmeAxiaSchemas";
import { PmeAxiaApplySuggestionButton } from "./PmeAxiaApplySuggestionButton";

interface PmeAxiaSuggestionCardProps {
  suggestion: PmeAxiaSuggestion;
  onApplyItem: (item: PmeAxiaSuggestionItem) => void;
}

export function PmeAxiaSuggestionCard({ suggestion, onApplyItem }: PmeAxiaSuggestionCardProps) {
  const [reviewStatus, setReviewStatus] = useState<"suggested" | "accepted" | "rejected">(
    "suggested"
  );

  return (
    <article className={`axia-suggestion-card severity-${suggestion.severity}`}>
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Axia · {suggestion.severity}</p>
          <h3>{suggestion.title}</h3>
        </div>
        <span className="status-pill">{reviewStatus}</span>
      </div>
      <p>{suggestion.description}</p>
      <p className="muted">Confiança: {Math.round(suggestion.confidenceScore * 100)}%</p>

      {suggestion.items.length === 0 ? (
        <div className="state-box compact-state">Sem ações estruturadas nesta sugestão.</div>
      ) : (
        <div className="axia-suggestion-items">
          {suggestion.items.map((item, index) => (
            <div className="read-row" key={`${item.suggestedAction}-${index}`}>
              <div>
                <strong>{labelForAction(item.suggestedAction)}</strong>
                <span>{payloadSummary(item.payload)}</span>
              </div>
              <PmeAxiaApplySuggestionButton item={item} onApply={onApplyItem} />
            </div>
          ))}
        </div>
      )}

      <div className="result-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={() => setReviewStatus("accepted")}
        >
          Aceitar sugestão
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => setReviewStatus("rejected")}
        >
          Rejeitar
        </button>
      </div>
    </article>
  );
}

function labelForAction(action: PmeAxiaSuggestionItem["suggestedAction"]): string {
  const labels: Record<PmeAxiaSuggestionItem["suggestedAction"], string> = {
    create_environment: "Criar ambiente",
    create_budget_item: "Criar item",
    create_material: "Criar material",
    create_labor: "Criar mão de obra",
    update_margin_warning: "Alerta de margem",
    create_proposal_text: "Texto de proposta",
    create_checklist_item: "Checklist",
    add_note: "Nota"
  };

  return labels[action];
}

function payloadSummary(payload: PmeAxiaSuggestionItem["payload"]): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (typeof payload === "number" || typeof payload === "boolean") {
    return String(payload);
  }

  if (payload === null) {
    return "Sem detalhes.";
  }

  if (Array.isArray(payload)) {
    return `${payload.length} detalhe(s) sugerido(s).`;
  }

  const description = payload.description;
  if (typeof description === "string") {
    return description;
  }

  const text = payload.text;
  if (typeof text === "string") {
    return text;
  }

  const label = payload.label;
  if (typeof label === "string") {
    return label;
  }

  return "Payload estruturado disponível para revisão.";
}
