import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { useCreatePmeProjectPurchase } from "../hooks/usePmeProjectMutations";
import { pmeProjectPurchaseSchema, pmeProjectPurchaseStatusSchema } from "../pmeProjectSchemas";
import type { PmeProjectPurchase, PmeProjectSnapshot } from "../pmeProjectUiTypes";

type PurchaseFormValues = Omit<PmeProjectPurchase, "id">;

export function PmeProjectPurchasesTab({ snapshot }: { snapshot: PmeProjectSnapshot }) {
  const createPurchase = useCreatePmeProjectPurchase(snapshot.project.id);
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(pmeProjectPurchaseSchema.omit({ id: true })),
    defaultValues: {
      supplierName: "",
      description: "",
      status: "planned",
      expectedTotalAmount: "0.00",
      actualTotalAmount: "0.00",
      expectedDeliveryDate: "",
      sourceType: "manual"
    }
  });

  return (
    <section className="tab-panel" aria-labelledby="purchases-title">
      <div className="section-heading">
        <div>
          <h2 id="purchases-title">Compras</h2>
          <p>Planeje materiais, acompanhe entrega e gere custos reais quando necessario.</p>
        </div>
      </div>
      <form
        className="quick-form horizontal-form"
        onSubmit={form.handleSubmit((values) => {
          createPurchase.mutate(values);
          form.reset();
        })}
      >
        <input placeholder="Descricao da compra" {...form.register("description")} />
        <input placeholder="Fornecedor" {...form.register("supplierName")} />
        <input placeholder="Total previsto" {...form.register("expectedTotalAmount")} />
        <select {...form.register("status")}>
          {pmeProjectPurchaseStatusSchema.options.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button className="primary-button" type="submit">
          Criar compra
        </button>
      </form>
      {snapshot.purchases.length === 0 ? (
        <div className="empty-state">Nenhuma compra planejada.</div>
      ) : (
        <div className="simple-list">
          {snapshot.purchases.map((purchase) => (
            <article className="simple-list-row" key={purchase.id}>
              <strong>{purchase.description}</strong>
              <span>{purchase.supplierName || "Sem fornecedor"}</span>
              <span>R$ {purchase.expectedTotalAmount}</span>
              <span className="status-pill">{purchase.status}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
