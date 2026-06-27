import type { SinapiCompositionSearchItem } from "@obrasys/domain";
import { useMemo, useState } from "react";

import type { PmeBudgetFormValues } from "../pmeBudgetSchemas";
import type { PmeSinapiAdaptationValues, PmeSinapiSearchValues } from "../pmeSinapiSchemas";
import {
  useAddPmeSinapiCompositionToBudget,
  usePmeSinapiCompositionDetails,
  usePmeSinapiSearch,
  usePmeSinapiStates
} from "../hooks/usePmeSinapi";
import { createLocalId } from "../pmeBudgetUtils";
import { Field } from "./formControls";

interface PmeSinapiPickerProps {
  budgetId: string;
  budgetItems: PmeBudgetFormValues["items"];
  onAddItem: (item: PmeBudgetFormValues["items"][number]) => void;
}

const initialSearch: PmeSinapiSearchValues = {
  uf: "SP",
  referenceMonth: 6,
  referenceYear: 2026,
  regime: "nao_desonerado",
  query: "",
  page: 1
};

export function PmeSinapiPicker({ budgetId, budgetItems, onAddItem }: PmeSinapiPickerProps) {
  const [search, setSearch] = useState<PmeSinapiSearchValues>(initialSearch);
  const [selected, setSelected] = useState<SinapiCompositionSearchItem | null>(null);
  const [adaptation, setAdaptation] = useState<PmeSinapiAdaptationValues>(() =>
    createAdaptationDefaults(null)
  );
  const statesQuery = usePmeSinapiStates();
  const searchQuery = usePmeSinapiSearch(search);
  const detailQuery = usePmeSinapiCompositionDetails(selected?.id ?? "", selected?.versionId ?? "");
  const addSinapi = useAddPmeSinapiCompositionToBudget();
  const hasMixedReference = useMemo(
    () => (selected ? hasMixedSinapiReference(budgetItems, selected) : false),
    [budgetItems, selected]
  );

  function selectComposition(composition: SinapiCompositionSearchItem) {
    setSelected(composition);
    setAdaptation(createAdaptationDefaults(composition));
  }

  async function addSelectedComposition() {
    if (selected === null) {
      return;
    }

    onAddItem(mapSinapiToBudgetItem(selected, adaptation));
    await addSinapi.mutateAsync({
      budgetId,
      compositionId: selected.id,
      versionId: selected.versionId,
      adaptation
    });
  }

  return (
    <div className="sinapi-panel">
      <div className="section-heading">
        <div>
          <h2>SINAPI</h2>
          <p>SINAPI é uma referência de custo. Ajuste conforme sua realidade local.</p>
        </div>
      </div>

      <div className="notice-box">
        Ao adicionar ao orçamento, este valor será congelado como snapshot. Atualizações futuras do
        SINAPI não alteram orçamentos já criados.
      </div>

      <div className="form-grid compact-grid">
        <Field label="UF">
          <select
            value={search.uf}
            onChange={(event) =>
              setSearch((current) => ({ ...current, uf: event.target.value, page: 1 }))
            }
          >
            {(statesQuery.data ?? []).map((state) => (
              <option value={state.uf} key={state.uf}>
                {state.uf}
              </option>
            ))}
            {statesQuery.data ? null : <option value="SP">SP</option>}
          </select>
        </Field>
        <Field label="Mês">
          <input
            type="number"
            min={1}
            max={12}
            value={search.referenceMonth}
            onChange={(event) =>
              setSearch((current) => ({
                ...current,
                referenceMonth: Number(event.target.value),
                page: 1
              }))
            }
          />
        </Field>
        <Field label="Ano">
          <input
            type="number"
            min={2000}
            value={search.referenceYear}
            onChange={(event) =>
              setSearch((current) => ({
                ...current,
                referenceYear: Number(event.target.value),
                page: 1
              }))
            }
          />
        </Field>
        <Field label="Regime">
          <select
            value={search.regime}
            onChange={(event) =>
              setSearch((current) => ({
                ...current,
                regime: event.target.value === "desonerado" ? "desonerado" : "nao_desonerado",
                page: 1
              }))
            }
          >
            <option value="nao_desonerado">Não desonerado</option>
            <option value="desonerado">Desonerado</option>
          </select>
        </Field>
        <Field label="Código ou descrição">
          <input
            value={search.query}
            onChange={(event) =>
              setSearch((current) => ({ ...current, query: event.target.value, page: 1 }))
            }
            placeholder="Ex.: pintura ou 88489"
          />
        </Field>
      </div>

      {searchQuery.isLoading ? <div className="state-box">Buscando SINAPI...</div> : null}
      {searchQuery.isError ? (
        <div className="state-box error-state">Não foi possível pesquisar SINAPI.</div>
      ) : null}

      <div className="sinapi-results">
        {searchQuery.data?.items.map((composition) => (
          <div className="sinapi-result" key={`${composition.versionId}-${composition.code}`}>
            <div>
              <strong>
                {composition.code} · {composition.description}
              </strong>
              <p>
                {composition.uf ?? composition.stateCode} {composition.referenceMonth}/
                {composition.referenceYear} · {composition.regime} · Unidade {composition.unit}
              </p>
              <small>
                Custo referência R$ {composition.totalCost} · Mão de obra R$ {composition.laborCost}{" "}
                · Material R$ {composition.materialCost}
              </small>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => selectComposition(composition)}
            >
              Ver composição
            </button>
          </div>
        ))}
      </div>

      {searchQuery.data ? (
        <div className="pagination-row">
          <button
            className="link-button"
            type="button"
            disabled={search.page <= 1}
            onClick={() => setSearch((current) => ({ ...current, page: current.page - 1 }))}
          >
            Página anterior
          </button>
          <span>
            Página {searchQuery.data.page} de {searchQuery.data.totalPages}
          </span>
          <button
            className="link-button"
            type="button"
            disabled={search.page >= searchQuery.data.totalPages}
            onClick={() => setSearch((current) => ({ ...current, page: current.page + 1 }))}
          >
            Próxima página
          </button>
        </div>
      ) : null}

      {selected ? (
        <div className="sinapi-detail-panel">
          <div className="section-heading">
            <div>
              <h2>{selected.code}</h2>
              <p>{selected.description}</p>
            </div>
          </div>

          {hasMixedReference ? (
            <div className="notice-box">
              Este orçamento já possui SINAPI de outra UF, mês, ano ou regime. Confira antes de
              enviar ao cliente.
            </div>
          ) : null}

          {detailQuery.data ? (
            <div className="details-grid">
              {detailQuery.data.items.map((item) => (
                <div className="detail-item" key={item.id}>
                  <span>{item.itemType}</span>
                  <strong>{item.description}</strong>
                  <small>
                    {item.coefficient} {item.unit} · R$ {item.totalCost}
                  </small>
                </div>
              ))}
            </div>
          ) : null}

          <div className="form-grid compact-grid">
            <Field label="Quantidade">
              <input
                inputMode="decimal"
                value={adaptation.quantity}
                onChange={(event) =>
                  setAdaptation((current) => ({ ...current, quantity: event.target.value }))
                }
              />
            </Field>
            <Field label="Unidade adaptada">
              <input
                value={adaptation.adaptedUnit}
                onChange={(event) =>
                  setAdaptation((current) => ({ ...current, adaptedUnit: event.target.value }))
                }
              />
            </Field>
            <Field label="Custo unit. adaptado">
              <input
                inputMode="decimal"
                value={adaptation.adaptedUnitCost}
                onChange={(event) =>
                  setAdaptation((current) => ({ ...current, adaptedUnitCost: event.target.value }))
                }
              />
            </Field>
            <Field label="Preço unit. final">
              <input
                inputMode="decimal"
                value={adaptation.adaptedUnitPrice}
                onChange={(event) =>
                  setAdaptation((current) => ({ ...current, adaptedUnitPrice: event.target.value }))
                }
              />
            </Field>
            <Field label="Perda %">
              <input
                inputMode="decimal"
                value={adaptation.wastePercentage}
                onChange={(event) =>
                  setAdaptation((current) => ({ ...current, wastePercentage: event.target.value }))
                }
              />
            </Field>
            <Field label="Produtividade %">
              <input
                inputMode="decimal"
                value={adaptation.productivityAdjustmentPercentage}
                onChange={(event) =>
                  setAdaptation((current) => ({
                    ...current,
                    productivityAdjustmentPercentage: event.target.value
                  }))
                }
              />
            </Field>
            <Field label="Margem %">
              <input
                inputMode="decimal"
                value={adaptation.marginPercentage}
                onChange={(event) =>
                  setAdaptation((current) => ({ ...current, marginPercentage: event.target.value }))
                }
              />
            </Field>
            <label className="checkbox-field inline-checkbox">
              <input
                type="checkbox"
                checked={adaptation.saveToCatalog}
                onChange={(event) =>
                  setAdaptation((current) => ({ ...current, saveToCatalog: event.target.checked }))
                }
              />
              Salvar no Meu Catálogo
            </label>
            <Field label="Descrição adaptada">
              <textarea
                rows={3}
                value={adaptation.adaptedDescription}
                onChange={(event) =>
                  setAdaptation((current) => ({
                    ...current,
                    adaptedDescription: event.target.value
                  }))
                }
              />
            </Field>
          </div>

          {addSinapi.isError ? (
            <div className="state-box error-state">Não foi possível adicionar o item SINAPI.</div>
          ) : null}

          <button
            className="primary-button"
            type="button"
            disabled={addSinapi.isPending}
            onClick={addSelectedComposition}
          >
            {addSinapi.isPending ? "Adicionando..." : "Adicionar ao orçamento"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function createAdaptationDefaults(
  composition: SinapiCompositionSearchItem | null
): PmeSinapiAdaptationValues {
  return {
    quantity: "1",
    adaptedDescription: composition?.description ?? "",
    adaptedUnit: composition?.unit ?? "un",
    adaptedUnitCost: composition?.originalUnitCost ?? "0.00",
    adaptedUnitPrice: composition?.originalUnitCost ?? "0.00",
    wastePercentage: "0",
    productivityAdjustmentPercentage: "0",
    marginPercentage: "20",
    saveToCatalog: false
  };
}

function mapSinapiToBudgetItem(
  composition: SinapiCompositionSearchItem,
  adaptation: PmeSinapiAdaptationValues
): PmeBudgetFormValues["items"][number] {
  return {
    id: createLocalId("item"),
    environmentId: "",
    description: adaptation.adaptedDescription,
    category: "servico",
    sourceType: "sinapi",
    sourceReferenceId: composition.id,
    source: "sinapi_optional",
    unit: adaptation.adaptedUnit,
    quantity: adaptation.quantity,
    unitCost: adaptation.adaptedUnitCost,
    unitPrice: adaptation.adaptedUnitPrice,
    wastePercentage: adaptation.wastePercentage,
    marginPercentage: adaptation.marginPercentage,
    sinapiSnapshot: {
      compositionId: composition.id,
      versionId: composition.versionId,
      code: composition.code,
      description: composition.description,
      unit: composition.unit,
      stateCode: composition.uf ?? composition.stateCode,
      referenceMonth: composition.referenceMonth,
      referenceYear: composition.referenceYear,
      originalUnitCost: composition.originalUnitCost,
      adaptedUnitPrice: adaptation.adaptedUnitPrice,
      productivityFactor: "1",
      wastePercentage: adaptation.wastePercentage,
      marginPercentage: adaptation.marginPercentage,
      usedAt: new Date().toISOString()
    },
    showOnProposal: true
  };
}

function hasMixedSinapiReference(
  items: PmeBudgetFormValues["items"],
  selected: SinapiCompositionSearchItem
): boolean {
  return items.some((item) => {
    if (typeof item.sinapiSnapshot === "undefined") {
      return false;
    }

    return (
      item.sinapiSnapshot.stateCode !== (selected.uf ?? selected.stateCode) ||
      item.sinapiSnapshot.referenceMonth !== selected.referenceMonth ||
      item.sinapiSnapshot.referenceYear !== selected.referenceYear
    );
  });
}
