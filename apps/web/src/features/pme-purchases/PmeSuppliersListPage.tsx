import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { usePmePurchaseMutations, usePmeSuppliers } from "./hooks/usePmePurchases";
import { pmeSupplierSchema, pmeSupplierTypeSchema } from "./pmePurchaseSchemas";
import type { PmeSupplier } from "./pmePurchaseTypes";

type SupplierFormValues = Omit<PmeSupplier, "id">;

export function PmeSuppliersListPage() {
  const suppliersQuery = usePmeSuppliers();
  const mutations = usePmePurchaseMutations("project-demo-1");
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(pmeSupplierSchema.omit({ id: true })),
    defaultValues: {
      name: "",
      tradeName: "",
      supplierType: "material",
      phone: "",
      email: "",
      city: "",
      state: "",
      isActive: true
    }
  });

  return (
    <section className="module-section" aria-labelledby="suppliers-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Fornecedores PME</p>
          <h1 id="suppliers-title">Fornecedores simples para obra e reforma</h1>
          <p className="muted">Cadastre fornecedores sem transformar a rotina em ERP pesado.</p>
        </div>
      </div>
      <form
        className="quick-form horizontal-form"
        onSubmit={form.handleSubmit((values) => {
          mutations.createSupplier.mutate(values);
          form.reset();
        })}
      >
        <input placeholder="Nome do fornecedor" {...form.register("name")} />
        <select {...form.register("supplierType")}>
          {pmeSupplierTypeSchema.options.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <input placeholder="Telefone" {...form.register("phone")} />
        <input placeholder="Cidade" {...form.register("city")} />
        <button className="primary-button" type="submit">
          Criar fornecedor
        </button>
      </form>
      {suppliersQuery.isLoading ? (
        <div className="state-box">Carregando fornecedores...</div>
      ) : null}
      {suppliersQuery.data && suppliersQuery.data.length > 0 ? (
        <div className="simple-list">
          {suppliersQuery.data.map((supplier) => (
            <article className="simple-list-row" key={supplier.id}>
              <div>
                <strong>{supplier.name}</strong>
                <p>{supplier.tradeName || supplier.supplierType}</p>
              </div>
              <span>{supplier.phone || "Sem telefone"}</span>
              <span>
                {supplier.city || "Sem cidade"}
                {supplier.state ? `/${supplier.state}` : ""}
              </span>
              <button
                className="link-button"
                disabled={!supplier.isActive}
                onClick={() => mutations.deactivateSupplier.mutate(supplier.id)}
                type="button"
              >
                {supplier.isActive ? "Desativar" : "Inativo"}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
