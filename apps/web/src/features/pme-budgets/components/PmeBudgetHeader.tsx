import type { PmeBudgetStatus } from "../pmeBudgetSchemas";
import { PmeBudgetStatusBadge } from "./PmeBudgetStatusBadge";

interface PmeBudgetHeaderProps {
  title: string;
  clientName: string;
  status: PmeBudgetStatus;
  validUntil: string;
  finalPrice: string;
  isSaving?: boolean;
  onBack: () => void;
  onSave?: () => void;
  onRecalculate?: () => void;
  onMarkSent?: () => void;
  onMarkApproved?: () => void;
}

export function PmeBudgetHeader({
  title,
  clientName,
  status,
  validUntil,
  finalPrice,
  isSaving = false,
  onBack,
  onSave,
  onRecalculate,
  onMarkSent,
  onMarkApproved
}: PmeBudgetHeaderProps) {
  return (
    <div className="editor-topbar">
      <button className="link-button" type="button" onClick={onBack}>
        Voltar
      </button>
      <div className="budget-title-block">
        <p className="eyebrow">Orçamento PME</p>
        <h1>{title.trim().length > 0 ? title : "Orçamento sem título"}</h1>
        <div className="header-meta">
          <span>{clientName.trim().length > 0 ? clientName : "Cliente não informado"}</span>
          <PmeBudgetStatusBadge status={status} />
          <span>{validUntil ? `Válido até ${validUntil}` : "Sem validade definida"}</span>
          <strong>R$ {finalPrice}</strong>
        </div>
      </div>
      <div className="topbar-actions">
        {onSave ? (
          <button className="primary-button" type="button" disabled={isSaving} onClick={onSave}>
            {isSaving ? "Salvando..." : "Salvar rascunho"}
          </button>
        ) : null}
        {onRecalculate ? (
          <button className="secondary-button" type="button" onClick={onRecalculate}>
            Recalcular
          </button>
        ) : null}
        {onMarkSent ? (
          <button className="secondary-button" type="button" onClick={onMarkSent}>
            Marcar como enviado
          </button>
        ) : null}
        {onMarkApproved ? (
          <button className="secondary-button" type="button" onClick={onMarkApproved}>
            Marcar como aprovado
          </button>
        ) : null}
      </div>
    </div>
  );
}
