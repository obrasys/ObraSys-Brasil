import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { PmePurchaseStatusBadge } from "./components/PmePurchaseStatusBadge";
import { PmePurchaseSummaryCards } from "./components/PmePurchaseSummaryCards";
import { PmeSupplierQuoteComparison } from "./components/PmeSupplierQuoteComparison";
import { usePmeProjectPurchases, usePmePurchaseMutations } from "./hooks/usePmePurchases";
import {
  pmePurchaseOrderSchema,
  pmePurchaseRequestSchema,
  pmeSupplierQuoteSchema
} from "./pmePurchaseSchemas";
import type { PmePurchaseOrder, PmePurchaseRequest, PmeSupplierQuote } from "./pmePurchaseTypes";

type RequestFormValues = Omit<PmePurchaseRequest, "id">;
type QuoteFormValues = Omit<PmeSupplierQuote, "id">;
type OrderFormValues = Omit<PmePurchaseOrder, "id">;

export function PmeProjectPurchasesPage({ projectId }: { projectId: string }) {
  const purchasesQuery = usePmeProjectPurchases(projectId);
  const mutations = usePmePurchaseMutations(projectId);
  const requestForm = useForm<RequestFormValues>({
    resolver: zodResolver(pmePurchaseRequestSchema.omit({ id: true })),
    defaultValues: {
      requestNumber: `SC-${Date.now().toString().slice(-4)}`,
      title: "",
      status: "requested",
      neededByDate: ""
    }
  });
  const quoteForm = useForm<QuoteFormValues>({
    resolver: zodResolver(pmeSupplierQuoteSchema.omit({ id: true })),
    defaultValues: {
      supplierNameSnapshot: "",
      status: "received",
      totalAmount: "0.00",
      deliveryCost: "0.00",
      discountAmount: "0.00",
      finalAmount: "0.00",
      validUntil: "",
      deliveryDeadline: "",
      paymentTerms: ""
    }
  });
  const orderForm = useForm<OrderFormValues>({
    resolver: zodResolver(pmePurchaseOrderSchema.omit({ id: true })),
    defaultValues: {
      orderNumber: `PC-${Date.now().toString().slice(-4)}`,
      supplierNameSnapshot: "",
      title: "",
      status: "draft",
      totalAmount: "0.00",
      expectedDeliveryDate: "",
      paymentStatus: "pending"
    }
  });

  if (purchasesQuery.isLoading) {
    return <div className="state-box">Carregando compras...</div>;
  }
  if (purchasesQuery.isError || !purchasesQuery.data) {
    return <div className="state-box error-state">Nao foi possivel carregar compras.</div>;
  }

  const snapshot = purchasesQuery.data;

  return (
    <section className="module-section project-module" aria-labelledby="purchases-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Compras da obra</p>
          <h1 id="purchases-title">Compras, cotacoes e entregas</h1>
          <p className="muted">
            Crie compra manual rapido ou compare fornecedores quando fizer sentido.
          </p>
        </div>
      </div>
      <PmePurchaseSummaryCards summary={snapshot.summary} />
      {snapshot.summary.isOverExpected ? (
        <div className="state-box error-state">Compra acima do previsto para esta obra.</div>
      ) : null}
      {snapshot.summary.delayedDeliveries > 0 ? (
        <div className="state-box warning-state">Ha entrega atrasada nesta obra.</div>
      ) : null}

      <div className="split-grid">
        <form
          className="quick-form"
          onSubmit={requestForm.handleSubmit((values) => {
            mutations.createRequest.mutate(values);
            requestForm.reset();
          })}
        >
          <h2>Solicitacao</h2>
          <input placeholder="Titulo da solicitacao" {...requestForm.register("title")} />
          <input type="date" {...requestForm.register("neededByDate")} />
          <button className="secondary-button" type="submit">
            Criar solicitacao
          </button>
        </form>
        <form
          className="quick-form"
          onSubmit={orderForm.handleSubmit((values) => {
            mutations.createOrder.mutate(values);
            orderForm.reset();
          })}
        >
          <h2>Nova compra</h2>
          <input placeholder="Fornecedor" {...orderForm.register("supplierNameSnapshot")} />
          <input placeholder="Descricao" {...orderForm.register("title")} />
          <input placeholder="Valor total" {...orderForm.register("totalAmount")} />
          <button className="primary-button" type="submit">
            Nova compra
          </button>
        </form>
      </div>

      <section className="tab-panel" aria-labelledby="quotes-title">
        <div className="section-heading">
          <div>
            <h2 id="quotes-title">Cotações</h2>
            <p>Compare preço, prazo e condição sem obrigar cotação em compra simples.</p>
          </div>
        </div>
        <form
          className="quick-form horizontal-form"
          onSubmit={quoteForm.handleSubmit((values) => {
            mutations.createQuote.mutate(values);
            quoteForm.reset();
          })}
        >
          <input placeholder="Fornecedor" {...quoteForm.register("supplierNameSnapshot")} />
          <input placeholder="Valor final" {...quoteForm.register("finalAmount")} />
          <input type="date" {...quoteForm.register("deliveryDeadline")} />
          <input placeholder="Pagamento" {...quoteForm.register("paymentTerms")} />
          <button className="secondary-button" type="submit">
            Criar cotacao
          </button>
        </form>
        <PmeSupplierQuoteComparison
          onSelect={(quoteId) => mutations.selectQuote.mutate(quoteId)}
          quotes={snapshot.quotes}
        />
      </section>

      <section className="tab-panel" aria-labelledby="orders-title">
        <h2 id="orders-title">Pedidos</h2>
        <div className="simple-list">
          {snapshot.orders.map((order) => (
            <article className="simple-list-row" key={order.id}>
              <div>
                <strong>{order.orderNumber}</strong>
                <p>{order.title}</p>
              </div>
              <span>{order.supplierNameSnapshot}</span>
              <span>R$ {order.totalAmount}</span>
              <PmePurchaseStatusBadge status={order.status} />
              <button
                className="link-button"
                onClick={() =>
                  mutations.registerDelivery.mutate({
                    purchaseOrderId: order.id,
                    deliveryDate: new Date().toISOString().slice(0, 10),
                    status: "complete"
                  })
                }
                type="button"
              >
                Registrar entrega
              </button>
              <button
                className="link-button"
                onClick={() => mutations.markAsPaid.mutate(order.id)}
                type="button"
              >
                Marcar como pago
              </button>
              <button
                className="link-button"
                disabled={Boolean(order.actualCostId)}
                onClick={() => mutations.createActualCost.mutate(order.id)}
                type="button"
              >
                {order.actualCostId ? "Custo gerado" : "Gerar custo"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
