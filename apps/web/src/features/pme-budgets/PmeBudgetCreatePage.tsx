import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Field } from "./components/formControls";
import { useSavePmeBudget } from "./hooks/usePmeBudgetMutations";
import { createPmeBudgetDraft } from "./pmeBudgetRepository";
import { pmeBudgetFormSchema, type PmeBudgetFormValues } from "./pmeBudgetSchemas";

interface PmeBudgetCreatePageProps {
  onBack: () => void;
  onCreated: (id: string) => void;
}

export function PmeBudgetCreatePage({ onBack, onCreated }: PmeBudgetCreatePageProps) {
  const saveBudget = useSavePmeBudget();
  const form = useForm<PmeBudgetFormValues>({
    resolver: zodResolver(pmeBudgetFormSchema),
    defaultValues: createPmeBudgetDraft(),
    mode: "onBlur"
  });

  async function handleSubmit(values: PmeBudgetFormValues) {
    const savedBudget = await saveBudget.mutateAsync(values);
    onCreated(savedBudget.id);
  }

  return (
    <section className="module-section" aria-labelledby="budget-create-title">
      <form className="budget-editor" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="editor-topbar">
          <button className="link-button" type="button" onClick={onBack}>
            Voltar
          </button>
          <div>
            <p className="eyebrow">Novo orçamento</p>
            <h1 id="budget-create-title">Comece pelo básico</h1>
            <p className="muted">
              Depois você detalha ambientes, materiais, mão de obra e pagamento.
            </p>
          </div>
          <button className="primary-button" type="submit" disabled={saveBudget.isPending}>
            {saveBudget.isPending ? "Criando..." : "Criar orçamento"}
          </button>
        </div>

        {saveBudget.isError ? (
          <div className="state-box error-state">Não foi possível criar o orçamento.</div>
        ) : null}

        <div className="tab-panel create-panel">
          <div className="form-grid">
            <Field label="Cliente" error={form.formState.errors.clientName?.message}>
              <input {...form.register("clientName")} placeholder="Nome do cliente" />
            </Field>
            <Field label="Título" error={form.formState.errors.title?.message}>
              <input {...form.register("title")} placeholder="Ex.: Pintura apartamento" />
            </Field>
            <Field label="Tipo de orçamento">
              <select {...form.register("budgetType")}>
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
            <Field label="Validade">
              <input type="date" {...form.register("validUntil")} />
            </Field>
            <Field label="Telefone">
              <input {...form.register("clientPhone")} />
            </Field>
            <Field label="E-mail" error={form.formState.errors.clientEmail?.message}>
              <input {...form.register("clientEmail")} />
            </Field>
            <Field label="Endereço da obra">
              <input {...form.register("workAddress")} />
            </Field>
            <Field label="Descrição">
              <textarea {...form.register("description")} rows={4} />
            </Field>
          </div>
        </div>
      </form>
    </section>
  );
}
