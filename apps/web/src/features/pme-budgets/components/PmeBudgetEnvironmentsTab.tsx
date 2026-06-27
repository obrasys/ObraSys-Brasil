import type { UseFieldArrayReturn, UseFormRegister } from "react-hook-form";

import type { PmeBudgetFormValues } from "../pmeBudgetSchemas";
import { createLocalId } from "../pmeBudgetUtils";
import { ArraySection, Field, RemoveButton } from "./formControls";

interface PmeBudgetEnvironmentsTabProps {
  fields: UseFieldArrayReturn<PmeBudgetFormValues, "environments">["fields"];
  register: UseFormRegister<PmeBudgetFormValues>;
  onAdd: (value: PmeBudgetFormValues["environments"][number]) => void;
  onRemove: (index: number) => void;
}

const environmentSuggestions = [
  "Banheiro",
  "Cozinha",
  "Sala",
  "Quarto",
  "Área externa",
  "Varanda",
  "Garagem",
  "Fachada",
  "Telhado",
  "Área de serviço",
  "Casa inteira",
  "Apartamento inteiro",
  "Comercial / Loja",
  "Outro"
];

export function PmeBudgetEnvironmentsTab({
  fields,
  register,
  onAdd,
  onRemove
}: PmeBudgetEnvironmentsTabProps) {
  return (
    <ArraySection
      title="Ambientes"
      description="Separe por cômodo, fachada, telhado ou etapa simples da obra."
      addLabel="Adicionar ambiente"
      onAdd={() => onAdd({ id: createLocalId("env"), name: "", description: "" })}
      isEmpty={fields.length === 0}
      emptyText="Nenhum ambiente cadastrado."
    >
      <div className="suggestion-row">
        {environmentSuggestions.map((name) => (
          <button
            className="chip-button"
            type="button"
            key={name}
            onClick={() => onAdd({ id: createLocalId("env"), name, description: "" })}
          >
            {name}
          </button>
        ))}
      </div>
      {fields.map((field, index) => (
        <div className="line-card" key={field.id}>
          <Field label="Nome">
            <input {...register(`environments.${index}.name`)} />
          </Field>
          <Field label="Descrição">
            <input {...register(`environments.${index}.description`)} />
          </Field>
          <RemoveButton onRemove={() => onRemove(index)} />
        </div>
      ))}
    </ArraySection>
  );
}
