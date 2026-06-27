import { useState } from "react";

import type {
  PmeBudgetConversionResult,
  PmeBudgetConversionValues
} from "../pmeBudgetConversionSchemas";
import type { PmeBudgetRecord } from "../pmeBudgetUiTypes";
import { PmeBudgetConvertModal } from "./PmeBudgetConvertModal";

interface PmeBudgetConvertButtonProps {
  budget: PmeBudgetRecord;
  isSubmitting: boolean;
  errorMessage?: string | undefined;
  onConvert: (values: PmeBudgetConversionValues) => void;
  lastResult?: PmeBudgetConversionResult | undefined;
}

export function PmeBudgetConvertButton({
  budget,
  isSubmitting,
  errorMessage,
  onConvert,
  lastResult
}: PmeBudgetConvertButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const convertedProjectId = budget.convertedProjectId ?? lastResult?.projectId ?? null;
  const canConvert = budget.status === "approved" && convertedProjectId === null;

  if (convertedProjectId !== null) {
    return (
      <div className="conversion-state">
        <span>Este orçamento já foi convertido em obra.</span>
        <a className="secondary-button" href={`/app/obras/${convertedProjectId}`}>
          Ir para obra
        </a>
      </div>
    );
  }

  return (
    <div className="conversion-state">
      {!canConvert ? (
        <span>Somente orçamentos aprovados podem ser convertidos em obra.</span>
      ) : null}
      <button
        className="primary-button"
        type="button"
        disabled={!canConvert || isSubmitting}
        title={
          !canConvert ? "Somente orçamentos aprovados podem ser convertidos em obra." : undefined
        }
        onClick={() => setIsModalOpen(true)}
      >
        Converter em obra
      </button>
      {isModalOpen ? (
        <PmeBudgetConvertModal
          budget={budget}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          onCancel={() => setIsModalOpen(false)}
          onConfirm={(values) => {
            onConvert(values);
            setIsModalOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
