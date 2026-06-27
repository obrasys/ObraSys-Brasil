import type { UseFieldArrayReturn, UseFormRegister } from "react-hook-form";

import type { PmeBudgetFormValues } from "../pmeBudgetSchemas";
import { createLocalId } from "../pmeBudgetUtils";
import { ArraySection, Field, RemoveButton } from "./formControls";

interface PmeBudgetMaterialsTabProps {
  fields: UseFieldArrayReturn<PmeBudgetFormValues, "materials">["fields"];
  items: PmeBudgetFormValues["items"];
  register: UseFormRegister<PmeBudgetFormValues>;
  onAdd: (value: PmeBudgetFormValues["materials"][number]) => void;
  onRemove: (index: number) => void;
}

export function PmeBudgetMaterialsTab({
  fields,
  items,
  register,
  onAdd,
  onRemove
}: PmeBudgetMaterialsTabProps) {
  return (
    <ArraySection
      title="Materiais"
      description="Controle quantidade, perda, fornecedor e status de compra."
      addLabel="Adicionar material"
      onAdd={() => onAdd(createBlankMaterial())}
      isEmpty={fields.length === 0}
      emptyText="Nenhum material cadastrado."
    >
      {fields.map((field, index) => (
        <div className="line-card material-line" key={field.id}>
          <Field label="Material">
            <input {...register(`materials.${index}.description`)} />
          </Field>
          <Field label="Item vinculado">
            <select {...register(`materials.${index}.itemId`)}>
              <option value="">Sem vínculo</option>
              {items.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.description || "Item sem descrição"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Qtd.">
            <input inputMode="decimal" {...register(`materials.${index}.quantity`)} />
          </Field>
          <Field label="Un.">
            <input {...register(`materials.${index}.unit`)} />
          </Field>
          <Field label="Custo unit.">
            <input inputMode="decimal" {...register(`materials.${index}.unitCost`)} />
          </Field>
          <Field label="Perda %">
            <input inputMode="decimal" {...register(`materials.${index}.wastePercentage`)} />
          </Field>
          <Field label="Fornecedor">
            <input {...register(`materials.${index}.supplierName`)} />
          </Field>
          <Field label="Compra">
            <select {...register(`materials.${index}.purchaseStatus`)}>
              <option value="not_purchased">Não comprado</option>
              <option value="quoted">Cotado</option>
              <option value="purchased">Comprado</option>
              <option value="delivered">Entregue</option>
              <option value="used">Usado</option>
            </select>
          </Field>
          <RemoveButton onRemove={() => onRemove(index)} />
        </div>
      ))}
    </ArraySection>
  );
}

function createBlankMaterial(): PmeBudgetFormValues["materials"][number] {
  return {
    id: createLocalId("mat"),
    itemId: "",
    description: "",
    unit: "un",
    quantity: "1",
    unitCost: "0.00",
    wastePercentage: "0",
    supplierName: "",
    purchaseStatus: "not_purchased"
  };
}
