import { useState } from "react";

import { usePmeAxiaAssistant } from "../hooks/usePmeAxia";
import type { PmeAxiaActionType, PmeAxiaSuggestionItem, PmeAxiaResponse } from "../pmeAxiaSchemas";
import type { PmeBudgetFormValues } from "../pmeBudgetSchemas";
import { PmeAxiaActionSelector } from "./PmeAxiaActionSelector";
import { PmeAxiaFeedbackForm } from "./PmeAxiaFeedbackForm";
import { PmeAxiaSuggestionList } from "./PmeAxiaSuggestionList";
import { PmeAxiaWarningsBox } from "./PmeAxiaWarningsBox";

interface PmeBudgetAxiaPanelProps {
  budgetId: string;
  budget: PmeBudgetFormValues;
  onAddBudgetItem: (item: PmeBudgetFormValues["items"][number]) => void;
  onAddEnvironment: (environment: PmeBudgetFormValues["environments"][number]) => void;
}

export function PmeBudgetAxiaPanel({
  budgetId,
  budget,
  onAddBudgetItem,
  onAddEnvironment
}: PmeBudgetAxiaPanelProps) {
  const [actionType, setActionType] = useState<PmeAxiaActionType>("suggest_missing_items");
  const [userMessage, setUserMessage] = useState("");
  const [lastResponse, setLastResponse] = useState<PmeAxiaResponse | null>(null);
  const axia = usePmeAxiaAssistant();

  async function generateSuggestions() {
    const response = await axia.mutateAsync({
      actionType,
      budgetId,
      userMessage
    });
    setLastResponse(response);
  }

  function applyItem(item: PmeAxiaSuggestionItem) {
    if (item.suggestedAction === "create_environment") {
      const payload = objectPayload(item.payload);
      onAddEnvironment({
        id: createId("env"),
        name: textField(payload, "name", "Ambiente sugerido"),
        description: textField(payload, "description", "")
      });
      return;
    }

    if (item.suggestedAction === "create_budget_item") {
      const payload = objectPayload(item.payload);
      onAddBudgetItem({
        id: createId("item"),
        environmentId: budget.environments[0]?.id ?? "",
        description: textField(payload, "description", "Item sugerido pela Axia"),
        category: categoryField(payload, "category"),
        sourceType: "axia_suggestion",
        source: "manual",
        unit: textField(payload, "unit", "un"),
        quantity: textField(payload, "quantity", "1"),
        unitCost: "0.00",
        unitPrice: "0.00",
        marginPercentage: "0",
        showOnProposal: true
      });
    }
  }

  return (
    <section className="axia-panel" aria-labelledby="pme-axia-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Axia consultiva</p>
          <h2 id="pme-axia-title">Pedir ajuda à Axia</h2>
          <p>
            A Axia gera sugestões para revisão humana. Ela não aprova, não altera preço oficial e
            não converte orçamento em obra.
          </p>
        </div>
      </div>

      <div className="notice-box">
        Não inclua CPF, dados bancários, senhas, tokens ou informações sensíveis no pedido.
      </div>

      <div className="form-grid">
        <PmeAxiaActionSelector value={actionType} onChange={setActionType} />
        <label className="field span-2">
          <span>Pedido para Axia</span>
          <textarea
            value={userMessage}
            maxLength={4000}
            rows={4}
            placeholder="Ex.: confira se falta algum item importante neste orçamento."
            onChange={(event) => setUserMessage(event.target.value)}
          />
        </label>
      </div>

      <div className="result-actions">
        <button
          className="primary-button"
          type="button"
          disabled={axia.isPending}
          onClick={() => {
            void generateSuggestions();
          }}
        >
          {axia.isPending ? "Gerando..." : "Gerar sugestões"}
        </button>
      </div>

      {axia.isError ? (
        <div className="state-box error-state">Não foi possível gerar sugestões da Axia.</div>
      ) : null}

      {lastResponse ? (
        <>
          <div className="state-box">
            <strong>{lastResponse.summary}</strong>
          </div>
          <PmeAxiaWarningsBox warnings={lastResponse.warnings} />
          <PmeAxiaSuggestionList suggestions={lastResponse.suggestions} onApplyItem={applyItem} />
          <PmeAxiaFeedbackForm runId={lastResponse.runId} />
        </>
      ) : (
        <div className="state-box">
          Escolha uma ação e gere sugestões. Nada será aplicado sem sua confirmação.
        </div>
      )}
    </section>
  );
}

function objectPayload(payload: PmeAxiaSuggestionItem["payload"]): Record<string, unknown> {
  return typeof payload === "object" && payload !== null && !Array.isArray(payload) ? payload : {};
}

function textField(payload: Record<string, unknown>, field: string, fallback: string): string {
  const value = payload[field];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function categoryField(
  payload: Record<string, unknown>,
  field: string
): PmeBudgetFormValues["items"][number]["category"] {
  const value = payload[field];
  if (
    value === "material" ||
    value === "mao_de_obra" ||
    value === "servico" ||
    value === "terceiro" ||
    value === "equipamento" ||
    value === "transporte" ||
    value === "descarte" ||
    value === "taxa" ||
    value === "outro"
  ) {
    return value;
  }

  return "servico";
}

function createId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}
