import type { UseFormRegister } from "react-hook-form";

import type { PmeBudgetFormValues } from "../pmeBudgetSchemas";
import type { PmeBudgetCalculationPreview } from "../pmeBudgetUiTypes";
import { Field } from "./formControls";

interface PmeBudgetPricingTabProps {
  register: UseFormRegister<PmeBudgetFormValues>;
  preview: PmeBudgetCalculationPreview;
}

export function PmeBudgetPricingTab({ register, preview }: PmeBudgetPricingTabProps) {
  return (
    <div className="pricing-tab">
      <div className="form-grid compact-grid">
        <Field label="Modo de preço">
          <select {...register("pricingMode")}>
            <option value="simple_margin">Margem simples</option>
            <option value="detailed_bdi" disabled>
              BDI detalhado futuro
            </option>
          </select>
        </Field>
        <Field label="Despesas gerais %">
          <input inputMode="decimal" {...register("overheadPercentage")} />
        </Field>
        <Field label="Impostos %">
          <input inputMode="decimal" {...register("taxPercentage")} />
        </Field>
        <Field label="Lucro %">
          <input inputMode="decimal" {...register("profitPercentage")} />
        </Field>
        <Field label="Desconto R$">
          <input inputMode="decimal" {...register("discountAmount")} />
        </Field>
      </div>
      <div className="totals-grid">
        <div>
          <span>Subtotal custo</span>
          <strong>R$ {preview.subtotalCost}</strong>
        </div>
        <div>
          <span>Despesas gerais</span>
          <strong>R$ {preview.overheadAmount}</strong>
        </div>
        <div>
          <span>Impostos</span>
          <strong>R$ {preview.taxAmount}</strong>
        </div>
        <div>
          <span>Lucro previsto</span>
          <strong>R$ {preview.profitAmount}</strong>
        </div>
        <div>
          <span>Desconto</span>
          <strong>R$ {preview.discountAmount}</strong>
        </div>
        <div>
          <span>Preço final</span>
          <strong>R$ {preview.finalPrice}</strong>
        </div>
      </div>
      <div className="notice-box">
        Estes dados são internos. A proposta do cliente deve mostrar preço de venda e condições, sem
        custo interno, lucro ou margem.
      </div>
    </div>
  );
}
