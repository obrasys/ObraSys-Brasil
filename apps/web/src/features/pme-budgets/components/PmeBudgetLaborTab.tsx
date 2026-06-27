import type { UseFieldArrayReturn, UseFormRegister } from "react-hook-form";

import type { PmeBudgetFormValues } from "../pmeBudgetSchemas";
import { createLocalId } from "../pmeBudgetUtils";
import { ArraySection, Field, RemoveButton } from "./formControls";

interface PmeBudgetLaborTabProps {
  fields: UseFieldArrayReturn<PmeBudgetFormValues, "labor">["fields"];
  items: PmeBudgetFormValues["items"];
  register: UseFormRegister<PmeBudgetFormValues>;
  onAdd: (value: PmeBudgetFormValues["labor"][number]) => void;
  onRemove: (index: number) => void;
}

const laborTypes = [
  "pedreiro",
  "servente",
  "pintor",
  "eletricista",
  "encanador",
  "gesseiro",
  "azulejista",
  "marceneiro",
  "jardineiro",
  "mestre_de_obras",
  "ajudante_geral",
  "terceiro",
  "outro"
];

const laborUnits = ["hora", "dia", "semana", "empreitada", "m2", "ponto", "unidade"];

export function PmeBudgetLaborTab({
  fields,
  items,
  register,
  onAdd,
  onRemove
}: PmeBudgetLaborTabProps) {
  return (
    <ArraySection
      title="Mão de obra"
      description="Separe profissional, quantidade, dias, custo e tipo de contrato."
      addLabel="Adicionar mão de obra"
      onAdd={() => onAdd(createBlankLabor())}
      isEmpty={fields.length === 0}
      emptyText="Nenhuma mão de obra cadastrada."
    >
      {fields.map((field, index) => (
        <div className="line-card labor-line" key={field.id}>
          <Field label="Item vinculado">
            <select {...register(`labor.${index}.itemId`)}>
              <option value="">Sem vínculo</option>
              {items.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.description || "Item sem descrição"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Profissional">
            <select {...register(`labor.${index}.laborType`)}>
              {laborTypes.map((type) => (
                <option value={type} key={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nome/função">
            <input {...register(`labor.${index}.roleName`)} />
          </Field>
          <Field label="Qtd.">
            <input inputMode="decimal" {...register(`labor.${index}.quantity`)} />
          </Field>
          <Field label="Un.">
            <select {...register(`labor.${index}.unit`)}>
              {laborUnits.map((unit) => (
                <option value={unit} key={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dias">
            <input inputMode="decimal" {...register(`labor.${index}.days`)} />
          </Field>
          <Field label="Custo unit.">
            <input inputMode="decimal" {...register(`labor.${index}.unitCost`)} />
          </Field>
          <Field label="Contrato">
            <input
              {...register(`labor.${index}.contractType`)}
              placeholder="diária, CLT, empreitada"
            />
          </Field>
          <RemoveButton onRemove={() => onRemove(index)} />
        </div>
      ))}
    </ArraySection>
  );
}

function createBlankLabor(): PmeBudgetFormValues["labor"][number] {
  return {
    id: createLocalId("labor"),
    itemId: "",
    laborType: "pedreiro",
    roleName: "Pedreiro",
    unit: "dia",
    quantity: "1",
    unitCost: "0.00",
    days: "1",
    contractType: "diaria"
  };
}
