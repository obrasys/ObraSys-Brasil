import type { UseFieldArrayReturn, UseFormRegister } from "react-hook-form";

import type { PmeBudgetFormValues } from "../pmeBudgetSchemas";
import { createLocalId } from "../pmeBudgetUtils";
import { ArraySection, Field, RemoveButton } from "./formControls";

interface PmeBudgetPaymentTermsTabProps {
  fields: UseFieldArrayReturn<PmeBudgetFormValues, "paymentTerms">["fields"];
  paymentTerms: PmeBudgetFormValues["paymentTerms"];
  register: UseFormRegister<PmeBudgetFormValues>;
  onAdd: (value: PmeBudgetFormValues["paymentTerms"][number]) => void;
  onReplace: (value: PmeBudgetFormValues["paymentTerms"]) => void;
  onRemove: (index: number) => void;
}

export function PmeBudgetPaymentTermsTab({
  fields,
  paymentTerms,
  register,
  onAdd,
  onReplace,
  onRemove
}: PmeBudgetPaymentTermsTabProps) {
  const percentageTotal = paymentTerms.reduce((total, term) => {
    if (typeof term.percentage === "string" && term.percentage.length > 0) {
      return total + Number(term.percentage);
    }

    return total;
  }, 0);
  const showPercentageWarning = paymentTerms.length > 0 && percentageTotal !== 100;

  return (
    <ArraySection
      title="Condições de pagamento"
      description="Monte parcelas por percentual, valor fixo, etapa ou medição."
      addLabel="Adicionar parcela"
      onAdd={() => onAdd(createBlankPaymentTerm(fields.length + 1))}
      isEmpty={fields.length === 0}
      emptyText="Nenhuma condição cadastrada."
    >
      <div className="template-row">
        <button className="chip-button" type="button" onClick={() => onReplace(templateTwoSteps())}>
          50% entrada / 50% entrega
        </button>
        <button
          className="chip-button"
          type="button"
          onClick={() => onReplace(templateThreeSteps())}
        >
          40% / 30% / 30%
        </button>
        <button
          className="chip-button"
          type="button"
          onClick={() => onReplace(templateMeasurement())}
        >
          30% entrada / medição
        </button>
      </div>

      {showPercentageWarning ? (
        <div className="notice-box">
          A soma das parcelas por percentual está em {percentageTotal}%. Ajuste para 100% antes de
          enviar ao cliente.
        </div>
      ) : null}

      {fields.map((field, index) => (
        <div className="line-card payment-line" key={field.id}>
          <Field label="Descrição">
            <input {...register(`paymentTerms.${index}.description`)} />
          </Field>
          <Field label="%">
            <input inputMode="decimal" {...register(`paymentTerms.${index}.percentage`)} />
          </Field>
          <Field label="Valor R$">
            <input inputMode="decimal" {...register(`paymentTerms.${index}.amount`)} />
          </Field>
          <Field label="Condição">
            <input {...register(`paymentTerms.${index}.dueCondition`)} />
          </Field>
          <Field label="Data">
            <input type="date" {...register(`paymentTerms.${index}.dueDate`)} />
          </Field>
          <RemoveButton onRemove={() => onRemove(index)} />
        </div>
      ))}
    </ArraySection>
  );
}

function createBlankPaymentTerm(
  installmentNumber: number
): PmeBudgetFormValues["paymentTerms"][number] {
  return {
    id: createLocalId("pay"),
    installmentNumber,
    description: "",
    dueOffsetDays: 0,
    dueCondition: "",
    dueDate: "",
    amount: "",
    percentage: ""
  };
}

function templateTwoSteps(): PmeBudgetFormValues["paymentTerms"] {
  return [
    {
      ...createBlankPaymentTerm(1),
      description: "Entrada",
      dueCondition: "Na aprovação",
      percentage: "50"
    },
    {
      ...createBlankPaymentTerm(2),
      description: "Entrega",
      dueCondition: "Na entrega",
      percentage: "50"
    }
  ];
}

function templateThreeSteps(): PmeBudgetFormValues["paymentTerms"] {
  return [
    {
      ...createBlankPaymentTerm(1),
      description: "Entrada",
      dueCondition: "Na aprovação",
      percentage: "40"
    },
    {
      ...createBlankPaymentTerm(2),
      description: "Meio da obra",
      dueCondition: "Na metade da execução",
      percentage: "30"
    },
    {
      ...createBlankPaymentTerm(3),
      description: "Final",
      dueCondition: "Na entrega",
      percentage: "30"
    }
  ];
}

function templateMeasurement(): PmeBudgetFormValues["paymentTerms"] {
  return [
    {
      ...createBlankPaymentTerm(1),
      description: "Entrada",
      dueCondition: "Na aprovação",
      percentage: "30"
    },
    {
      ...createBlankPaymentTerm(2),
      description: "Restante por medição",
      dueCondition: "Conforme avanço medido",
      percentage: "70"
    }
  ];
}
