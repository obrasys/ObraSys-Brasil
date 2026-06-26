import { zodResolver } from "@hookform/resolvers/zod";
import {
  SINAPI_DEMO_COMPOSITIONS,
  adaptSinapiComposition,
  buildAxiaPmeAssistantResponse,
  hasMixedSinapiReference,
  searchSinapiCompositions,
  type AxiaPmeAssistantResponse,
  type AxiaPmeBudgetContext,
  type AxiaPmeTask,
  type SinapiCompositionSearchItem,
  type SinapiReference
} from "@obrasys/domain";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, type FieldErrors } from "react-hook-form";

import {
  calculatePmeBudgetPreview,
  createPmeBudgetDraft,
  saveSinapiItemToCatalog,
  type PmeBudgetCalculationPreview
} from "./pmeBudgetRepository";
import {
  pmeBudgetFormSchema,
  type PmeBudgetFormValues,
  type PmeBudgetStatus
} from "./pmeBudgetSchemas";
import { usePmeBudget, useSavePmeBudget } from "./usePmeBudgets";

interface PmeBudgetEditorPageProps {
  budgetId: string | null;
  onBack: () => void;
  onSaved: (id: string) => void;
}

type EditorTab =
  | "summary"
  | "environments"
  | "items"
  | "materials"
  | "labor"
  | "sinapi"
  | "axia"
  | "pricing"
  | "payment";

const tabs: Array<{ id: EditorTab; label: string }> = [
  { id: "summary", label: "Resumo" },
  { id: "environments", label: "Ambientes" },
  { id: "items", label: "Itens" },
  { id: "materials", label: "Materiais" },
  { id: "labor", label: "Mão de obra" },
  { id: "sinapi", label: "SINAPI" },
  { id: "axia", label: "Axia" },
  { id: "pricing", label: "Margem e impostos" },
  { id: "payment", label: "Pagamento" }
];

const statusOptions: Array<{ value: PmeBudgetStatus; label: string }> = [
  { value: "draft", label: "Rascunho" },
  { value: "sent", label: "Enviado" },
  { value: "negotiation", label: "Negociação" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Rejeitado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "converted_to_project", label: "Virou obra" }
];

export function PmeBudgetEditorPage({ budgetId, onBack, onSaved }: PmeBudgetEditorPageProps) {
  const isNew = budgetId === null;
  const budgetQuery = usePmeBudget(budgetId);
  const saveBudget = useSavePmeBudget();
  const [activeTab, setActiveTab] = useState<EditorTab>("summary");
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
  const preview = useMemo(() => getPreview(values), [values]);
  const existingSinapiReferences = useMemo(() => getSinapiReferences(values), [values]);

  useEffect(() => {
    if (isNew) {
      form.reset(createPmeBudgetDraft());
      return;
    }

    if (budgetQuery.data) {
      form.reset(budgetQuery.data);
    }
  }, [budgetQuery.data, form, isNew]);

  async function handleValidSubmit(valuesToSave: PmeBudgetFormValues) {
    const savedBudget = await saveBudget.mutateAsync(valuesToSave);
    onSaved(savedBudget.id);
  }

  if (!isNew && budgetQuery.isLoading) {
    return <div className="state-box">Carregando orçamento...</div>;
  }

  if (!isNew && budgetQuery.data === null) {
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
        <div className="editor-topbar">
          <button className="link-button" type="button" onClick={onBack}>
            ← Voltar
          </button>
          <div>
            <p className="eyebrow">{isNew ? "Novo orçamento" : "Editar orçamento"}</p>
            <h1 id="budget-editor-title">
              {values.title.trim().length > 0 ? values.title : "Orçamento PME"}
            </h1>
          </div>
          <button className="primary-button" type="submit" disabled={saveBudget.isPending}>
            {saveBudget.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>

        {saveBudget.isError ? (
          <div className="state-box error-state">Não foi possível salvar o orçamento.</div>
        ) : null}

        <div className="editor-layout">
          <aside className="summary-rail" aria-label="Resumo financeiro">
            <strong>Prévia interna</strong>
            <Metric label="Custo interno" value={`R$ ${preview.subtotalCost}`} tone="internal" />
            <Metric label="Preço de venda" value={`R$ ${preview.finalPrice}`} tone="sale" />
            <Metric label="Impostos" value={`R$ ${preview.taxAmount}`} />
            <Metric label="Lucro simulado" value={`R$ ${preview.profitAmount}`} tone="internal" />
            <div className="client-preview">
              <strong>Visão do cliente</strong>
              <p>
                Mostra serviços, condições e preço de venda. Não mostra custo nem margem interna.
              </p>
            </div>
          </aside>

          <div className="editor-main">
            <nav className="tabs" aria-label="Abas do orçamento">
              {tabs.map((tab) => (
                <button
                  className={tab.id === activeTab ? "tab active" : "tab"}
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="tab-panel">
              {activeTab === "summary" ? (
                <SummaryTab register={form.register} errors={form.formState.errors} />
              ) : null}

              {activeTab === "environments" ? (
                <EnvironmentsTab
                  fields={environments.fields}
                  register={form.register}
                  onAdd={() =>
                    environments.append({
                      id: createLocalId("env"),
                      name: "",
                      description: ""
                    })
                  }
                  onRemove={environments.remove}
                />
              ) : null}

              {activeTab === "items" ? (
                <ItemsTab
                  fields={items.fields}
                  register={form.register}
                  onAdd={() =>
                    items.append({
                      id: createLocalId("item"),
                      environmentId: "",
                      description: "",
                      source: "manual",
                      unit: "un",
                      quantity: "1",
                      unitCost: "0.00",
                      unitPrice: "0.00",
                      showOnProposal: true
                    })
                  }
                  onRemove={items.remove}
                />
              ) : null}

              {activeTab === "materials" ? (
                <MaterialsTab
                  fields={materials.fields}
                  register={form.register}
                  onAdd={() =>
                    materials.append({
                      id: createLocalId("mat"),
                      itemId: "",
                      description: "",
                      unit: "un",
                      quantity: "1",
                      unitCost: "0.00",
                      supplierName: ""
                    })
                  }
                  onRemove={materials.remove}
                />
              ) : null}

              {activeTab === "labor" ? (
                <LaborTab
                  fields={labor.fields}
                  register={form.register}
                  onAdd={() =>
                    labor.append({
                      id: createLocalId("labor"),
                      itemId: "",
                      roleName: "",
                      unit: "h",
                      quantity: "1",
                      unitCost: "0.00"
                    })
                  }
                  onRemove={labor.remove}
                />
              ) : null}

              {activeTab === "sinapi" ? (
                <SinapiTab
                  existingReferences={existingSinapiReferences}
                  onAddItem={(item) => items.append(item)}
                />
              ) : null}

              {activeTab === "axia" ? <AxiaTab values={values} /> : null}

              {activeTab === "pricing" ? <PricingTab register={form.register} /> : null}

              {activeTab === "payment" ? (
                <PaymentTermsTab
                  fields={paymentTerms.fields}
                  register={form.register}
                  onAdd={() =>
                    paymentTerms.append({
                      id: createLocalId("pay"),
                      description: "",
                      dueOffsetDays: 0,
                      amount: "",
                      percentage: ""
                    })
                  }
                  onRemove={paymentTerms.remove}
                />
              ) : null}
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}

interface TabProps {
  register: ReturnType<typeof useForm<PmeBudgetFormValues>>["register"];
}

function SummaryTab({ register, errors }: TabProps & { errors: FieldErrors<PmeBudgetFormValues> }) {
  return (
    <div className="form-grid">
      <Field label="Número" error={errors.budgetNumber?.message}>
        <input {...register("budgetNumber")} />
      </Field>
      <Field label="Status">
        <select {...register("status")}>
          {statusOptions.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Título" error={errors.title?.message}>
        <input {...register("title")} placeholder="Ex.: Reforma de banheiro" />
      </Field>
      <Field label="Cliente" error={errors.clientName?.message}>
        <input {...register("clientName")} placeholder="Nome do cliente" />
      </Field>
      <Field label="Telefone">
        <input {...register("clientPhone")} />
      </Field>
      <Field label="E-mail">
        <input {...register("clientEmail")} />
      </Field>
      <Field label="Endereço da obra">
        <input {...register("workAddress")} />
      </Field>
      <Field label="Validade">
        <input type="date" {...register("validUntil")} />
      </Field>
      <Field label="Descrição">
        <textarea {...register("description")} rows={4} />
      </Field>
    </div>
  );
}

interface ArrayTabProps extends TabProps {
  fields: Array<{ id: string }>;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

function EnvironmentsTab({ fields, register, onAdd, onRemove }: ArrayTabProps) {
  return (
    <ArraySection
      title="Ambientes"
      description="Use ambientes como banheiro, cozinha, sala ou etapa da obra."
      addLabel="Adicionar ambiente"
      onAdd={onAdd}
      isEmpty={fields.length === 0}
    >
      {fields.map((field, index) => (
        <div className="line-card" key={field.id}>
          <Field label="Nome">
            <input {...register(`environments.${index}.name`)} />
          </Field>
          <Field label="Descrição">
            <input {...register(`environments.${index}.description`)} />
          </Field>
          <RemoveButton onRemove={() => onRemove(index)} />
        </div>
      ))}
    </ArraySection>
  );
}

function ItemsTab({ fields, register, onAdd, onRemove }: ArrayTabProps) {
  return (
    <ArraySection
      title="Itens e serviços"
      description="Comece manualmente ou marque origem no Meu Catálogo. SINAPI fica opcional."
      addLabel="Adicionar item"
      onAdd={onAdd}
      isEmpty={fields.length === 0}
    >
      {fields.map((field, index) => (
        <div className="line-card item-line" key={field.id}>
          <Field label="Serviço">
            <input {...register(`items.${index}.description`)} />
          </Field>
          <Field label="Origem">
            <select {...register(`items.${index}.source`)}>
              <option value="manual">Manual</option>
              <option value="catalog">Meu Catálogo</option>
              <option value="sinapi_optional">SINAPI opcional</option>
            </select>
          </Field>
          <Field label="Un.">
            <input {...register(`items.${index}.unit`)} />
          </Field>
          <Field label="Qtd.">
            <input inputMode="decimal" {...register(`items.${index}.quantity`)} />
          </Field>
          <Field label="Custo interno">
            <input inputMode="decimal" {...register(`items.${index}.unitCost`)} />
          </Field>
          <Field label="Preço venda">
            <input inputMode="decimal" {...register(`items.${index}.unitPrice`)} />
          </Field>
          <label className="checkbox-field">
            <input type="checkbox" {...register(`items.${index}.showOnProposal`)} />
            Mostrar na proposta
          </label>
          <RemoveButton onRemove={() => onRemove(index)} />
        </div>
      ))}
    </ArraySection>
  );
}

function MaterialsTab({ fields, register, onAdd, onRemove }: ArrayTabProps) {
  return (
    <ArraySection
      title="Materiais"
      description="Separe materiais para enxergar custo interno com clareza."
      addLabel="Adicionar material"
      onAdd={onAdd}
      isEmpty={fields.length === 0}
    >
      {fields.map((field, index) => (
        <div className="line-card material-line" key={field.id}>
          <Field label="Material">
            <input {...register(`materials.${index}.description`)} />
          </Field>
          <Field label="Un.">
            <input {...register(`materials.${index}.unit`)} />
          </Field>
          <Field label="Qtd.">
            <input inputMode="decimal" {...register(`materials.${index}.quantity`)} />
          </Field>
          <Field label="Custo unit.">
            <input inputMode="decimal" {...register(`materials.${index}.unitCost`)} />
          </Field>
          <Field label="Fornecedor">
            <input {...register(`materials.${index}.supplierName`)} />
          </Field>
          <RemoveButton onRemove={() => onRemove(index)} />
        </div>
      ))}
    </ArraySection>
  );
}

function LaborTab({ fields, register, onAdd, onRemove }: ArrayTabProps) {
  return (
    <ArraySection
      title="Mão de obra"
      description="Lance horas, diárias ou empreitada sem misturar com material."
      addLabel="Adicionar mão de obra"
      onAdd={onAdd}
      isEmpty={fields.length === 0}
    >
      {fields.map((field, index) => (
        <div className="line-card labor-line" key={field.id}>
          <Field label="Função">
            <input {...register(`labor.${index}.roleName`)} />
          </Field>
          <Field label="Un.">
            <input {...register(`labor.${index}.unit`)} />
          </Field>
          <Field label="Qtd.">
            <input inputMode="decimal" {...register(`labor.${index}.quantity`)} />
          </Field>
          <Field label="Custo unit.">
            <input inputMode="decimal" {...register(`labor.${index}.unitCost`)} />
          </Field>
          <RemoveButton onRemove={() => onRemove(index)} />
        </div>
      ))}
    </ArraySection>
  );
}

function SinapiTab({
  existingReferences,
  onAddItem
}: {
  existingReferences: SinapiReference[];
  onAddItem: (item: PmeBudgetFormValues["items"][number]) => void;
}) {
  const [stateCode, setStateCode] = useState("SP");
  const [referenceMonth, setReferenceMonth] = useState(6);
  const [referenceYear, setReferenceYear] = useState(2026);
  const [query, setQuery] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [productivityFactor, setProductivityFactor] = useState("1");
  const [wastePercentage, setWastePercentage] = useState("0");
  const [marginPercentage, setMarginPercentage] = useState("20");
  const [catalogMessage, setCatalogMessage] = useState<string | null>(null);
  const results = searchSinapiCompositions({
    stateCode,
    referenceMonth,
    referenceYear,
    query,
    compositions: SINAPI_DEMO_COMPOSITIONS
  });
  const mixedReference = hasMixedSinapiReference(existingReferences, {
    stateCode,
    referenceMonth,
    referenceYear
  });

  function buildItem(
    composition: SinapiCompositionSearchItem
  ): PmeBudgetFormValues["items"][number] {
    const adaptation = adaptSinapiComposition({
      composition,
      quantity,
      productivityFactor,
      wastePercentage,
      marginPercentage
    });

    return {
      id: createLocalId("item"),
      environmentId: "",
      description: `${adaptation.code} - ${adaptation.description}`,
      source: "sinapi_optional",
      unit: adaptation.unit,
      quantity: adaptation.quantity,
      unitCost: adaptation.originalUnitCost,
      unitPrice: adaptation.adaptedUnitPrice,
      sinapiSnapshot: {
        compositionId: adaptation.compositionId,
        versionId: adaptation.versionId,
        code: adaptation.code,
        description: adaptation.description,
        unit: adaptation.unit,
        stateCode: adaptation.stateCode,
        referenceMonth: adaptation.referenceMonth,
        referenceYear: adaptation.referenceYear,
        originalUnitCost: adaptation.originalUnitCost,
        adaptedUnitPrice: adaptation.adaptedUnitPrice,
        productivityFactor: adaptation.productivityFactor,
        wastePercentage: adaptation.wastePercentage,
        marginPercentage: adaptation.marginPercentage,
        usedAt: adaptation.usedAt
      },
      showOnProposal: true
    };
  }

  function handleSaveCatalog(composition: SinapiCompositionSearchItem) {
    const item = buildItem(composition);

    if (typeof item.sinapiSnapshot === "undefined") {
      return;
    }

    const payload = saveSinapiItemToCatalog(item.sinapiSnapshot);
    setCatalogMessage(`Item "${payload.name}" preparado para salvar no Meu Catálogo.`);
  }

  return (
    <div className="sinapi-panel">
      <div className="section-heading">
        <div>
          <h2>SINAPI opcional</h2>
          <p>
            Use como referência técnica, ajuste para sua realidade local e mantenha o snapshot no
            orçamento.
          </p>
        </div>
      </div>

      <div className="form-grid compact-grid">
        <Field label="UF">
          <select value={stateCode} onChange={(event) => setStateCode(event.target.value)}>
            <option value="SP">SP</option>
            <option value="RJ">RJ</option>
          </select>
        </Field>
        <Field label="Mês">
          <input
            type="number"
            min={1}
            max={12}
            value={referenceMonth}
            onChange={(event) => setReferenceMonth(Number(event.target.value))}
          />
        </Field>
        <Field label="Ano">
          <input
            type="number"
            min={2000}
            value={referenceYear}
            onChange={(event) => setReferenceYear(Number(event.target.value))}
          />
        </Field>
        <Field label="Pesquisar">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Código ou descrição"
          />
        </Field>
      </div>

      <div className="form-grid compact-grid">
        <Field label="Qtd.">
          <input
            value={quantity}
            inputMode="decimal"
            onChange={(event) => setQuantity(event.target.value)}
          />
        </Field>
        <Field label="Produtividade">
          <input
            value={productivityFactor}
            inputMode="decimal"
            onChange={(event) => setProductivityFactor(event.target.value)}
          />
        </Field>
        <Field label="Perda (%)">
          <input
            value={wastePercentage}
            inputMode="decimal"
            onChange={(event) => setWastePercentage(event.target.value)}
          />
        </Field>
        <Field label="Margem (%)">
          <input
            value={marginPercentage}
            inputMode="decimal"
            onChange={(event) => setMarginPercentage(event.target.value)}
          />
        </Field>
      </div>

      {mixedReference ? (
        <div className="notice-box">
          Este orçamento já possui item SINAPI de outra UF ou mês/ano. Você pode continuar, mas
          destaque essa mistura antes de enviar a proposta.
        </div>
      ) : null}

      {catalogMessage ? <div className="state-box">{catalogMessage}</div> : null}

      <div className="sinapi-results">
        {results.length === 0 ? (
          <div className="state-box">Nenhuma composição encontrada para esta referência.</div>
        ) : null}

        {results.map((composition) => {
          const adaptation = adaptSinapiComposition({
            composition,
            quantity,
            productivityFactor,
            wastePercentage,
            marginPercentage
          });

          return (
            <div className="sinapi-result" key={`${composition.versionId}-${composition.code}`}>
              <div>
                <strong>
                  {composition.code} · {composition.description}
                </strong>
                <p>
                  {composition.stateCode} {composition.referenceMonth}/{composition.referenceYear} ·
                  Custo original R$ {adaptation.originalUnitCost} · Preço adaptado R${" "}
                  {adaptation.adaptedUnitPrice}
                </p>
              </div>
              <div className="result-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => onAddItem(buildItem(composition))}
                >
                  Adicionar ao orçamento
                </button>
                <button
                  className="link-button"
                  type="button"
                  onClick={() => handleSaveCatalog(composition)}
                >
                  Salvar no Meu Catálogo
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AxiaTab({ values }: { values: PmeBudgetFormValues }) {
  const [task, setTask] = useState<AxiaPmeTask>("suggest_missing_items");
  const [userText, setUserText] = useState("");
  const [response, setResponse] = useState<AxiaPmeAssistantResponse | null>(null);

  function handleGenerate() {
    setResponse(
      buildAxiaPmeAssistantResponse({
        task,
        userText,
        context: buildAxiaContextFromForm(values)
      })
    );
  }

  return (
    <div className="axia-panel">
      <div className="section-heading">
        <div>
          <h2>Axia consultiva</h2>
          <p>
            Gere sugestões como rascunho. A Axia não aprova, não altera preço final e não converte
            orçamento em obra.
          </p>
        </div>
      </div>

      <div className="form-grid">
        <Field label="O que a Axia deve fazer?">
          <select value={task} onChange={(event) => setTask(event.target.value as AxiaPmeTask)}>
            <option value="suggest_missing_items">Sugerir itens faltantes</option>
            <option value="draft_from_text">Criar rascunho a partir de texto</option>
            <option value="draft_from_renovation_description">
              Rascunho por descrição de reforma
            </option>
            <option value="suggest_environments_services">Sugerir ambientes e serviços</option>
            <option value="low_margin_alert">Alertar margem baixa</option>
            <option value="compare_sinapi_reference">Comparar com SINAPI</option>
            <option value="commercial_proposal_text">Texto da proposta comercial</option>
            <option value="execution_checklist">Checklist de execução</option>
          </select>
        </Field>
        <Field label="Texto de apoio">
          <textarea
            value={userText}
            rows={5}
            onChange={(event) => setUserText(event.target.value)}
            placeholder="Ex.: reforma de banheiro com troca de piso, pintura e louças."
          />
        </Field>
      </div>

      <div className="notice-box">
        Não inclua CPF, dados bancários, tokens ou senhas. O backend também sanitiza o contexto
        antes de registrar e enviar para a Axia.
      </div>

      <button className="secondary-button" type="button" onClick={handleGenerate}>
        Gerar sugestão
      </button>

      {response ? (
        <div className="axia-results">
          <strong>{response.message}</strong>
          {response.insights.map((insight) => (
            <div className="axia-insight" key={`${insight.type}-${insight.title}`}>
              <span className="status-pill">{insight.status}</span>
              <h3>{insight.title}</h3>
              <p>{insight.summary}</p>
              <ul>
                {insight.evidence.map((evidence) => (
                  <li key={evidence}>{evidence}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PricingTab({ register }: TabProps) {
  return (
    <div className="form-grid compact-grid">
      <Field label="Overhead (%)">
        <input inputMode="decimal" {...register("overheadPercentage")} />
      </Field>
      <Field label="Impostos simplificados (%)">
        <input inputMode="decimal" {...register("taxPercentage")} />
      </Field>
      <Field label="Lucro/margem interna (%)">
        <input inputMode="decimal" {...register("profitPercentage")} />
      </Field>
      <Field label="Desconto (R$)">
        <input inputMode="decimal" {...register("discountAmount")} />
      </Field>
      <div className="notice-box">
        Estes campos são internos. A proposta do cliente deve exibir preço de venda e condições, sem
        revelar custo ou margem.
      </div>
    </div>
  );
}

function PaymentTermsTab({ fields, register, onAdd, onRemove }: ArrayTabProps) {
  return (
    <ArraySection
      title="Condições de pagamento"
      description="Use parcelas simples por percentual ou valor fixo."
      addLabel="Adicionar condição"
      onAdd={onAdd}
      isEmpty={fields.length === 0}
    >
      {fields.map((field, index) => (
        <div className="line-card payment-line" key={field.id}>
          <Field label="Descrição">
            <input {...register(`paymentTerms.${index}.description`)} />
          </Field>
          <Field label="Dias">
            <input
              type="number"
              min={0}
              {...register(`paymentTerms.${index}.dueOffsetDays`, { valueAsNumber: true })}
            />
          </Field>
          <Field label="Valor R$">
            <input inputMode="decimal" {...register(`paymentTerms.${index}.amount`)} />
          </Field>
          <Field label="%">
            <input inputMode="decimal" {...register(`paymentTerms.${index}.percentage`)} />
          </Field>
          <RemoveButton onRemove={() => onRemove(index)} />
        </div>
      ))}
    </ArraySection>
  );
}

interface FieldProps {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}

function Field({ label, error, children }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}

interface ArraySectionProps {
  title: string;
  description: string;
  addLabel: string;
  isEmpty: boolean;
  onAdd: () => void;
  children: React.ReactNode;
}

function ArraySection({
  title,
  description,
  addLabel,
  isEmpty,
  onAdd,
  children
}: ArraySectionProps) {
  return (
    <div className="array-section">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <button className="secondary-button" type="button" onClick={onAdd}>
          {addLabel}
        </button>
      </div>
      {isEmpty ? <div className="state-box">Nada lançado ainda.</div> : children}
    </div>
  );
}

function RemoveButton({ onRemove }: { onRemove: () => void }) {
  return (
    <button className="ghost-button" type="button" onClick={onRemove}>
      Remover
    </button>
  );
}

function Metric({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone?: "internal" | "sale";
}) {
  return (
    <div className={tone ? `metric ${tone}` : "metric"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getPreview(values: PmeBudgetFormValues): PmeBudgetCalculationPreview {
  const parsed = pmeBudgetFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      subtotalCost: "0.00",
      overheadAmount: "0.00",
      taxAmount: "0.00",
      profitAmount: "0.00",
      discountAmount: "0.00",
      finalPrice: "0.00"
    };
  }

  return calculatePmeBudgetPreview(parsed.data);
}

function getSinapiReferences(values: PmeBudgetFormValues): SinapiReference[] {
  return values.items.flatMap((item) => {
    if (typeof item.sinapiSnapshot === "undefined") {
      return [];
    }

    return [
      {
        stateCode: item.sinapiSnapshot.stateCode,
        referenceMonth: item.sinapiSnapshot.referenceMonth,
        referenceYear: item.sinapiSnapshot.referenceYear
      }
    ];
  });
}

function buildAxiaContextFromForm(values: PmeBudgetFormValues): AxiaPmeBudgetContext {
  const sinapiReferences = values.items.flatMap((item) => {
    if (typeof item.sinapiSnapshot === "undefined") {
      return [];
    }

    return [
      {
        code: item.sinapiSnapshot.code,
        description: item.sinapiSnapshot.description,
        stateCode: item.sinapiSnapshot.stateCode,
        referenceMonth: item.sinapiSnapshot.referenceMonth,
        referenceYear: item.sinapiSnapshot.referenceYear,
        originalUnitCost: item.sinapiSnapshot.originalUnitCost,
        adaptedUnitPrice: item.sinapiSnapshot.adaptedUnitPrice
      }
    ];
  });

  return {
    ...(typeof values.id === "undefined" ? {} : { budgetId: values.id }),
    budgetNumber: values.budgetNumber,
    title: values.title,
    ...(typeof values.description === "undefined" ? {} : { description: values.description }),
    status: values.status,
    environments: values.environments.map((environment) => ({
      name: environment.name,
      ...(typeof environment.description === "undefined"
        ? {}
        : { description: environment.description })
    })),
    items: values.items.map((item) => ({
      description: item.description,
      itemType: item.source,
      unit: item.unit,
      quantity: item.quantity,
      showOnProposal: item.showOnProposal
    })),
    totals: {
      profitPercentage: values.profitPercentage,
      taxPercentage: values.taxPercentage
    },
    sinapiReferences
  };
}

function createLocalId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}
