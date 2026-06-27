import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { useCreatePmeProjectReceipt } from "../hooks/usePmeProjectMutations";
import { pmeProjectReceiptSchema, pmeProjectReceiptStatusSchema } from "../pmeProjectSchemas";
import type { PmeProjectReceipt, PmeProjectSnapshot } from "../pmeProjectUiTypes";

type ReceiptFormValues = Omit<PmeProjectReceipt, "id">;

export function PmeProjectReceiptsTab({ snapshot }: { snapshot: PmeProjectSnapshot }) {
  const createReceipt = useCreatePmeProjectReceipt(snapshot.project.id);
  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(pmeProjectReceiptSchema.omit({ id: true })),
    defaultValues: {
      description: "",
      amount: "0.00",
      receiptStatus: "planned",
      dueDate: "",
      receivedAt: "",
      paymentMethod: "",
      notes: ""
    }
  });

  return (
    <section className="tab-panel" aria-labelledby="receipts-title">
      <div className="section-heading">
        <div>
          <h2 id="receipts-title">Recebimentos</h2>
          <p>Veja previsoes, registre recebimentos e acompanhe vencidos.</p>
        </div>
      </div>
      <form
        className="quick-form horizontal-form"
        onSubmit={form.handleSubmit((values) => {
          createReceipt.mutate(values);
          form.reset();
        })}
      >
        <input placeholder="Descricao" {...form.register("description")} />
        <input placeholder="Valor" {...form.register("amount")} />
        <select {...form.register("receiptStatus")}>
          {pmeProjectReceiptStatusSchema.options.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <input type="date" {...form.register("dueDate")} />
        <button className="primary-button" type="submit">
          Registrar recebimento
        </button>
      </form>
      <div className="simple-list">
        {snapshot.receipts.map((receipt) => (
          <article className="simple-list-row" key={receipt.id}>
            <strong>{receipt.description}</strong>
            <span>R$ {receipt.amount}</span>
            <span>{receipt.dueDate || "Sem vencimento"}</span>
            <span className={`status-pill receipt-${receipt.receiptStatus}`}>
              {receipt.receiptStatus}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
