import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { PmeBudgetFormValues } from "../pmeBudgetSchemas";
import type { PmeCatalogPickerEntry } from "../pmeBudgetUiTypes";
import { pmeBudgetKeys } from "../hooks/usePmeBudgets";
import { createLocalId } from "../pmeBudgetUtils";
import { pmeBudgetClient } from "../services/pmeBudgetClient";
import { Field } from "./formControls";

interface PmeCatalogPickerProps {
  onAddItem: (item: PmeBudgetFormValues["items"][number]) => void;
  onAddKit: (items: PmeBudgetFormValues["items"]) => void;
}

export function PmeCatalogPicker({ onAddItem, onAddKit }: PmeCatalogPickerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");
  const [includeInactive, setIncludeInactive] = useState(false);
  const catalogQuery = useQuery({
    queryKey: pmeBudgetKeys.catalog(query, category, type, includeInactive),
    queryFn: () => pmeBudgetClient.searchCatalog({ query, category, type, includeInactive })
  });

  function handleAdd(entry: PmeCatalogPickerEntry) {
    if (entry.type === "kit" && entry.items) {
      onAddKit(entry.items.map((item) => mapCatalogItemToBudgetItem(item, "kit")));
      return;
    }

    onAddItem(mapCatalogItemToBudgetItem(entry, "catalog"));
  }

  return (
    <div className="catalog-picker">
      <div className="section-heading">
        <div>
          <h2>Meu Catálogo</h2>
          <p>Busque itens, composições ou kits salvos pela empresa. O uso é opcional.</p>
        </div>
      </div>

      <div className="form-grid compact-grid">
        <Field label="Buscar">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Serviço, material ou kit"
          />
        </Field>
        <Field label="Categoria">
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">Todas</option>
            <option value="servico">Serviços</option>
            <option value="material">Materiais</option>
            <option value="mao_de_obra">Mão de obra</option>
            <option value="outro">Outros</option>
          </select>
        </Field>
        <Field label="Tipo">
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">Todos</option>
            <option value="item">Item</option>
            <option value="composition">Composição</option>
            <option value="kit">Kit</option>
          </select>
        </Field>
        <label className="checkbox-field inline-checkbox">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => setIncludeInactive(event.target.checked)}
          />
          Mostrar inativos
        </label>
      </div>

      {catalogQuery.isLoading ? <div className="state-box">Carregando catálogo...</div> : null}
      {catalogQuery.isError ? (
        <div className="state-box error-state">Não foi possível carregar o catálogo.</div>
      ) : null}
      {catalogQuery.data?.length === 0 ? (
        <div className="state-box">Nenhum item encontrado no Meu Catálogo.</div>
      ) : null}

      <div className="catalog-results">
        {catalogQuery.data?.map((entry) => (
          <div
            className={entry.isActive ? "catalog-entry" : "catalog-entry inactive"}
            key={entry.id}
          >
            <div>
              <strong>{entry.name}</strong>
              <p>{entry.description}</p>
              <small>
                {entry.type === "kit"
                  ? "Kit"
                  : entry.type === "composition"
                    ? "Composição"
                    : "Item"}{" "}
                · {entry.category} · R$ {entry.unitPrice}
              </small>
            </div>
            <button
              className="secondary-button"
              type="button"
              disabled={!entry.isActive}
              onClick={() => handleAdd(entry)}
            >
              {entry.type === "kit" ? "Adicionar kit completo" : "Adicionar ao orçamento"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function mapCatalogItemToBudgetItem(
  entry: Pick<
    PmeCatalogPickerEntry,
    "description" | "category" | "unit" | "quantity" | "unitCost" | "unitPrice"
  >,
  source: "catalog" | "kit"
): PmeBudgetFormValues["items"][number] {
  return {
    id: createLocalId("item"),
    environmentId: "",
    description: entry.description,
    category: entry.category,
    sourceType: source === "kit" ? "kit" : "meu_catalogo",
    source: "catalog",
    unit: entry.unit,
    quantity: entry.quantity,
    unitCost: entry.unitCost,
    unitPrice: entry.unitPrice,
    marginPercentage: "0",
    showOnProposal: true
  };
}
