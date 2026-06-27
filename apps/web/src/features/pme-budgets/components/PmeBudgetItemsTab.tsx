import type { UseFieldArrayReturn, UseFormRegister } from "react-hook-form";
import { useState } from "react";

import type { PmeBudgetFormValues } from "../pmeBudgetSchemas";
import { createLocalId } from "../pmeBudgetUtils";
import { ArraySection, Field, RemoveButton } from "./formControls";
import { PmeCatalogPicker } from "./PmeCatalogPicker";
import { PmeSinapiPicker } from "./PmeSinapiPicker";

interface PmeBudgetItemsTabProps {
  budgetId: string;
  fields: UseFieldArrayReturn<PmeBudgetFormValues, "items">["fields"];
  environments: PmeBudgetFormValues["environments"];
  items: PmeBudgetFormValues["items"];
  register: UseFormRegister<PmeBudgetFormValues>;
  onAdd: (value: PmeBudgetFormValues["items"][number]) => void;
  onAddMany: (values: PmeBudgetFormValues["items"]) => void;
  onRemove: (index: number) => void;
}

export function PmeBudgetItemsTab({
  budgetId,
  fields,
  environments,
  items,
  register,
  onAdd,
  onAddMany,
  onRemove
}: PmeBudgetItemsTabProps) {
  const [showSinapi, setShowSinapi] = useState(false);

  return (
    <div className="split-tab">
      <ArraySection
        title="Itens e serviços"
        description="Comece com item manual, Meu Catálogo ou SINAPI como referência opcional."
        addLabel="Adicionar item manual"
        onAdd={() => onAdd(createBlankItem())}
        isEmpty={fields.length === 0}
        emptyText="Nenhum item cadastrado. Adicione um serviço manual para começar."
      >
        <div className="template-row">
          <button
            className="secondary-button"
            type="button"
            onClick={() => setShowSinapi((current) => !current)}
          >
            Adicionar do SINAPI
          </button>
        </div>
        {fields.map((field, index) => (
          <div className="line-card item-line" key={field.id}>
            <Field label="Ambiente">
              <select {...register(`items.${index}.environmentId`)}>
                <option value="">Sem ambiente</option>
                {environments.map((environment) => (
                  <option value={environment.id} key={environment.id}>
                    {environment.name || "Ambiente sem nome"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Descrição">
              <input {...register(`items.${index}.description`)} />
            </Field>
            <Field label="Categoria">
              <select {...register(`items.${index}.category`)}>
                <option value="servico">Serviço</option>
                <option value="material">Material</option>
                <option value="mao_de_obra">Mão de obra</option>
                <option value="terceiro">Terceiro</option>
                <option value="equipamento">Equipamento</option>
                <option value="transporte">Transporte</option>
                <option value="descarte">Descarte</option>
                <option value="taxa">Taxa</option>
                <option value="outro">Outro</option>
              </select>
            </Field>
            <Field label="Qtd.">
              <input inputMode="decimal" {...register(`items.${index}.quantity`)} />
            </Field>
            <Field label="Un.">
              <input {...register(`items.${index}.unit`)} />
            </Field>
            <Field label="Custo unit.">
              <input inputMode="decimal" {...register(`items.${index}.unitCost`)} />
            </Field>
            <Field label="Preço unit.">
              <input inputMode="decimal" {...register(`items.${index}.unitPrice`)} />
            </Field>
            <Field label="Margem %">
              <input inputMode="decimal" {...register(`items.${index}.marginPercentage`)} />
            </Field>
            <label className="checkbox-field">
              <input type="checkbox" {...register(`items.${index}.showOnProposal`)} />
              Mostrar na proposta
            </label>
            <button className="link-button" type="button">
              Salvar no Meu Catálogo
            </button>
            <RemoveButton onRemove={() => onRemove(index)} />
          </div>
        ))}
      </ArraySection>
      {showSinapi ? (
        <PmeSinapiPicker budgetId={budgetId} budgetItems={items} onAddItem={onAdd} />
      ) : null}
      <PmeCatalogPicker onAddItem={onAdd} onAddKit={onAddMany} />
    </div>
  );
}

function createBlankItem(): PmeBudgetFormValues["items"][number] {
  return {
    id: createLocalId("item"),
    environmentId: "",
    description: "",
    category: "servico",
    sourceType: "manual",
    source: "manual",
    unit: "un",
    quantity: "1",
    unitCost: "0.00",
    unitPrice: "0.00",
    marginPercentage: "0",
    showOnProposal: true
  };
}
