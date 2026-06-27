import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { PmeBudgetAxiaPanel } from "./components/PmeBudgetAxiaPanel";
import { PmeBudgetEnvironmentsTab } from "./components/PmeBudgetEnvironmentsTab";
import { PmeBudgetHeader } from "./components/PmeBudgetHeader";
import { PmeBudgetItemsTab } from "./components/PmeBudgetItemsTab";
import { PmeBudgetLaborTab } from "./components/PmeBudgetLaborTab";
import { PmeBudgetMaterialsTab } from "./components/PmeBudgetMaterialsTab";
import { PmeBudgetPaymentTermsTab } from "./components/PmeBudgetPaymentTermsTab";
import { PmeBudgetPricingTab } from "./components/PmeBudgetPricingTab";
import { PmeBudgetSummaryTab } from "./components/PmeBudgetSummaryTab";
import { PmeBudgetTabs } from "./components/PmeBudgetTabs";
import { PmeBudgetTotalsCard } from "./components/PmeBudgetTotalsCard";
import { usePmeBudget } from "./hooks/usePmeBudget";
import { getLocalPmeBudgetPreview, usePmeBudgetCalculation } from "./hooks/usePmeBudgetCalculation";
import { useSavePmeBudget, useUpdatePmeBudgetStatus } from "./hooks/usePmeBudgetMutations";
import { createPmeBudgetDraft } from "./pmeBudgetRepository";
import { pmeBudgetFormSchema, type PmeBudgetFormValues } from "./pmeBudgetSchemas";
import type { PmeBudgetCalculationPreview, PmeBudgetEditorTab } from "./pmeBudgetUiTypes";

interface PmeBudgetEditPageProps {
  budgetId: string;
  onBack: () => void;
  onSaved: (id: string) => void;
}

const emptyPreview: PmeBudgetCalculationPreview = {
  subtotalCost: "0.00",
  subtotalPrice: "0.00",
  overheadAmount: "0.00",
  taxAmount: "0.00",
  profitAmount: "0.00",
  discountAmount: "0.00",
  finalPrice: "0.00"
};

export function PmeBudgetEditPage({ budgetId, onBack, onSaved }: PmeBudgetEditPageProps) {
  const budgetQuery = usePmeBudget(budgetId);
  const saveBudget = useSavePmeBudget();
  const updateStatus = useUpdatePmeBudgetStatus();
  const calculation = usePmeBudgetCalculation();
  const [activeTab, setActiveTab] = useState<PmeBudgetEditorTab>("summary");
  const form = useForm<PmeBudgetFormValues>({
    resolver: zodResolver(pmeBudgetFormSchema),
    defaultValues: createPmeBudgetDraft(),
    mode: "onBlur"
  });
  const environments = useFieldArray({ control: form.control, name: "environments" });
  const items = useFieldArray({ control: form.control, name: "items" });
  const materials = useFieldArray({ control: form.control, name: "materials" });
  const labor = useFieldArray({ control: form.control, name: "labor" });
  const paymentTerms = useFieldArray({ control: form.control, name: "paymentTerms" });
  const values = form.watch();
  const preview = useMemo(() => safePreview(values), [values]);

  useEffect(() => {
    if (budgetQuery.data) {
      form.reset(budgetQuery.data);
    }
  }, [budgetQuery.data, form]);

  async function handleValidSubmit(valuesToSave: PmeBudgetFormValues) {
    const savedBudget = await saveBudget.mutateAsync(valuesToSave);
    onSaved(savedBudget.id);
  }

  function submitDraft() {
    void form.handleSubmit(handleValidSubmit)();
  }

  function recalculate() {
    void calculation.mutateAsync(values);
  }

  function markStatus(status: "sent" | "approved") {
    void updateStatus.mutateAsync({ id: budgetId, status });
  }

  if (budgetQuery.isLoading) {
    return <div className="state-box">Carregando orçamento...</div>;
  }

  if (budgetQuery.data === null || typeof budgetQuery.data === "undefined") {
    return (
      <div className="state-box error-state">
        Orçamento não encontrado.
        <button className="secondary-button" type="button" onClick={onBack}>
          Voltar
        </button>
      </div>
    );
  }

  return (
    <section className="module-section" aria-labelledby="budget-editor-title">
      <form className="budget-editor" onSubmit={form.handleSubmit(handleValidSubmit)}>
        <PmeBudgetHeader
          title={values.title}
          clientName={values.clientName}
          status={values.status}
          validUntil={values.validUntil ?? ""}
          finalPrice={calculation.data?.finalPrice ?? preview.finalPrice}
          isSaving={saveBudget.isPending}
          onBack={onBack}
          onSave={submitDraft}
          onRecalculate={recalculate}
          onMarkSent={() => markStatus("sent")}
          onMarkApproved={() => markStatus("approved")}
        />

        {saveBudget.isError ? (
          <div className="state-box error-state">Não foi possível salvar o orçamento.</div>
        ) : null}
        {calculation.isError ? (
          <div className="state-box error-state">Não foi possível recalcular este orçamento.</div>
        ) : null}

        <div className="editor-layout">
          <PmeBudgetTotalsCard
            preview={preview}
            officialPreview={calculation.data}
            isCalculating={calculation.isPending}
          />
          <div className="editor-main">
            <PmeBudgetTabs activeTab={activeTab} onChange={setActiveTab} />
            <div className="tab-panel">
              {activeTab === "summary" ? (
                <PmeBudgetSummaryTab
                  register={form.register}
                  errors={form.formState.errors}
                  preview={preview}
                />
              ) : null}
              {activeTab === "environments" ? (
                <PmeBudgetEnvironmentsTab
                  fields={environments.fields}
                  register={form.register}
                  onAdd={environments.append}
                  onRemove={environments.remove}
                />
              ) : null}
              {activeTab === "items" ? (
                <PmeBudgetItemsTab
                  budgetId={budgetId}
                  fields={items.fields}
                  environments={values.environments}
                  items={values.items}
                  register={form.register}
                  onAdd={items.append}
                  onAddMany={items.append}
                  onRemove={items.remove}
                />
              ) : null}
              {activeTab === "materials" ? (
                <PmeBudgetMaterialsTab
                  fields={materials.fields}
                  items={values.items}
                  register={form.register}
                  onAdd={materials.append}
                  onRemove={materials.remove}
                />
              ) : null}
              {activeTab === "labor" ? (
                <PmeBudgetLaborTab
                  fields={labor.fields}
                  items={values.items}
                  register={form.register}
                  onAdd={labor.append}
                  onRemove={labor.remove}
                />
              ) : null}
              {activeTab === "pricing" ? (
                <PmeBudgetPricingTab register={form.register} preview={preview} />
              ) : null}
              {activeTab === "payment" ? (
                <PmeBudgetPaymentTermsTab
                  fields={paymentTerms.fields}
                  paymentTerms={values.paymentTerms}
                  register={form.register}
                  onAdd={paymentTerms.append}
                  onReplace={paymentTerms.replace}
                  onRemove={paymentTerms.remove}
                />
              ) : null}
              {activeTab === "axia" ? (
                <PmeBudgetAxiaPanel
                  budgetId={budgetId}
                  budget={values}
                  onAddBudgetItem={items.append}
                  onAddEnvironment={environments.append}
                />
              ) : null}
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}

function safePreview(values: PmeBudgetFormValues): PmeBudgetCalculationPreview {
  try {
    return getLocalPmeBudgetPreview(values);
  } catch {
    return emptyPreview;
  }
}
