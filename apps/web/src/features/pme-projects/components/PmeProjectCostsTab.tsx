import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { useCreatePmeProjectActualCost } from "../hooks/usePmeProjectMutations";
import {
  pmeProjectActualCostSchema,
  pmeProjectCostTypeSchema,
  pmeProjectPaymentStatusSchema
} from "../pmeProjectSchemas";
import type { PmeProjectActualCost, PmeProjectSnapshot } from "../pmeProjectUiTypes";

type CostFormValues = Omit<PmeProjectActualCost, "id">;

export function PmeProjectCostsTab({ snapshot }: { snapshot: PmeProjectSnapshot }) {
  const createCost = useCreatePmeProjectActualCost(snapshot.project.id);
  const form = useForm<CostFormValues>({
    resolver: zodResolver(pmeProjectActualCostSchema.omit({ id: true })),
    defaultValues: {
      costType: "material",
      description: "",
      amount: "0.00",
      paymentStatus: "pending",
      paymentDate: "",
      supplierName: "",
      notes: ""
    }
  });

  return (
    <section className="tab-panel" aria-labelledby="costs-title">
      <div className="section-heading">
        <div>
          <h2 id="costs-title">Custos reais</h2>
          <p>Lance custos pagos ou pendentes sem alterar o orcamento base aprovado.</p>
        </div>
      </div>
      <form
        className="quick-form horizontal-form"
        onSubmit={form.handleSubmit((values) => {
          createCost.mutate(values);
          form.reset();
        })}
      >
        <input placeholder="Descricao do custo" {...form.register("description")} />
        <input placeholder="Valor" {...form.register("amount")} />
        <select {...form.register("costType")}>
          {pmeProjectCostTypeSchema.options.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select {...form.register("paymentStatus")}>
          {pmeProjectPaymentStatusSchema.options.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button className="primary-button" type="submit">
          Lancar custo
        </button>
        {form.formState.errors.amount ? (
          <p className="form-error">{form.formState.errors.amount.message}</p>
        ) : null}
      </form>
      <div className="simple-list">
        {snapshot.actualCosts.map((cost) => (
          <article className="simple-list-row" key={cost.id}>
            <strong>{cost.description}</strong>
            <span>{cost.costType}</span>
            <span>R$ {cost.amount}</span>
            <span className="status-pill">{cost.paymentStatus}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
