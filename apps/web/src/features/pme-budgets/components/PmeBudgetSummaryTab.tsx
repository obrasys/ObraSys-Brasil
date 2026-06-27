import type { FieldErrors, UseFormRegister } from "react-hook-form";

import type { PmeBudgetFormValues } from "../pmeBudgetSchemas";
import type { PmeBudgetCalculationPreview } from "../pmeBudgetUiTypes";
import { Field } from "./formControls";

interface PmeBudgetSummaryTabProps {
  register: UseFormRegister<PmeBudgetFormValues>;
  errors: FieldErrors<PmeBudgetFormValues>;
  preview: PmeBudgetCalculationPreview;
}

export function PmeBudgetSummaryTab({ register, errors, preview }: PmeBudgetSummaryTabProps) {
  return (
    <div className="summary-tab">
      <div className="form-grid">
        <Field label="Número" error={errors.budgetNumber?.message}>
          <input {...register("budgetNumber")} />
        </Field>
        <Field label="Título" error={errors.title?.message}>
          <input {...register("title")} placeholder="Ex.: Reforma de banheiro" />
        </Field>
        <Field label="Cliente" error={errors.clientName?.message}>
          <input {...register("clientName")} placeholder="Nome do cliente" />
        </Field>
        <Field label="Tipo de orçamento">
          <select {...register("budgetType")}>
            <option value="reforma_banheiro">Reforma de banheiro</option>
            <option value="reforma_cozinha">Reforma de cozinha</option>
            <option value="pintura">Pintura</option>
            <option value="troca_piso">Troca de piso</option>
            <option value="reforma_apartamento">Reforma de apartamento</option>
            <option value="manutencao">Manutenção</option>
            <option value="construcao_pequena">Construção pequena</option>
            <option value="outro">Outro</option>
          </select>
        </Field>
        <Field label="Telefone">
          <input {...register("clientPhone")} />
        </Field>
        <Field label="E-mail" error={errors.clientEmail?.message}>
          <input {...register("clientEmail")} />
        </Field>
        <Field label="Endereço da obra">
          <input {...register("workAddress")} />
        </Field>
        <Field label="Validade">
          <input type="date" {...register("validUntil")} />
        </Field>
        <Field label="Descrição">
          <textarea {...register("description")} rows={4} />
        </Field>
      </div>

      <div className="totals-grid">
        <div>
          <span>Custo interno</span>
          <strong>R$ {preview.subtotalCost}</strong>
        </div>
        <div>
          <span>Preço de venda</span>
          <strong>R$ {preview.finalPrice}</strong>
        </div>
        <div>
          <span>Margem estimada</span>
          <strong>R$ {preview.profitAmount}</strong>
        </div>
      </div>
    </div>
  );
}
