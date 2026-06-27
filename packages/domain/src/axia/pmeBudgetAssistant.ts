export type AxiaPmeActionType =
  | "create_budget_draft"
  | "suggest_missing_items"
  | "review_budget_margin"
  | "compare_with_sinapi"
  | "generate_proposal_text"
  | "generate_execution_checklist"
  | "explain_budget_to_client";

export type AxiaPmeTask = AxiaPmeActionType;

export type AxiaSuggestionType =
  | "budget_draft"
  | "missing_item"
  | "margin_alert"
  | "sinapi_comparison"
  | "proposal_text"
  | "execution_checklist"
  | "client_explanation"
  | "risk_alert";

export type AxiaInsightType = AxiaSuggestionType;

export type AxiaSuggestionSeverity = "low" | "medium" | "high" | "critical";
export type AxiaSuggestionStatus = "suggested" | "accepted" | "rejected" | "applied" | "archived";
export type AxiaDraftStatus = "draft" | "suggested" | "pending_approval";

export type AxiaSuggestedAction =
  | "create_environment"
  | "create_budget_item"
  | "create_material"
  | "create_labor"
  | "update_margin_warning"
  | "create_proposal_text"
  | "create_checklist_item"
  | "add_note";

export type AxiaJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: AxiaJson | undefined }
  | AxiaJson[];

export interface AxiaSanitizationResult {
  sanitizedText: string;
  removedFields: string[];
}

export interface AxiaContextSanitizationResult {
  sanitizedContext: AxiaPmeBudgetContext;
  removedFields: string[];
  redactionSummary: Record<string, number>;
}

export interface AxiaPmeBudgetContext {
  budgetId?: string;
  title?: string;
  description?: string;
  budgetNumber?: string;
  budgetType?: string;
  status?: string;
  environments?: Array<{
    name: string;
    description?: string | null;
  }>;
  items?: Array<{
    description: string;
    category?: string;
    itemType?: string;
    unit?: string;
    quantity?: string;
    unitPrice?: string;
    showOnProposal?: boolean;
  }>;
  totals?: {
    subtotalCost?: string;
    finalPrice?: string;
    profitPercentage?: string;
    taxPercentage?: string;
    discountAmount?: string;
  };
  paymentTerms?: Array<{
    description: string;
    percentage?: string | null;
    amount?: string | null;
    dueCondition?: string | null;
  }>;
  sinapiReferences?: Array<{
    code: string;
    description: string;
    stateCode: string;
    referenceMonth: number;
    referenceYear: number;
    originalUnitCost: string;
    adaptedUnitPrice: string;
  }>;
}

export interface AxiaPmeAssistantInput {
  actionType: AxiaPmeActionType;
  userMessage: string;
  context: AxiaPmeBudgetContext;
}

export interface AxiaPmeSuggestionItem {
  suggestedAction: AxiaSuggestedAction;
  payload: AxiaJson;
}

export interface AxiaPmeSuggestion {
  type: AxiaSuggestionType;
  title: string;
  description: string;
  severity: AxiaSuggestionSeverity;
  confidenceScore: number;
  status: AxiaDraftStatus;
  items: AxiaPmeSuggestionItem[];
}

export interface AxiaPmeAssistantResponse {
  summary: string;
  suggestions: AxiaPmeSuggestion[];
  warnings: string[];
  humanValidationRequired: true;
}

export interface AxiaPmeInsight {
  type: AxiaSuggestionType;
  status: "suggested";
  title: string;
  summary: string;
  evidence: string[];
  suggestedPayload: AxiaJson;
}

const sensitivePatterns: Array<{ label: string; pattern: RegExp; replacement: string }> = [
  {
    label: "phone",
    pattern: /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4}[-\s]?\d{4}\b/g,
    replacement: "[telefone-removido]"
  },
  {
    label: "cpf_or_cnpj",
    pattern: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
    replacement: "[documento-removido]"
  },
  {
    label: "email",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: "[email-removido]"
  },
  {
    label: "bank_account",
    pattern: /\b(?:ag[eê]ncia|conta|iban|pix|chave pix)\b\s*[:#-]?\s*[\w.\-/@]+/gi,
    replacement: "[dado-bancario-removido]"
  },
  {
    label: "secret",
    pattern: /\b(?:token|senha|password|secret|api[_-]?key|authorization)\s*[:=]\s*\S+/gi,
    replacement: "[segredo-removido]"
  }
];

export function sanitizeAxiaText(input: string): AxiaSanitizationResult {
  const removedFields = new Set<string>();
  let sanitizedText = input;

  for (const rule of sensitivePatterns) {
    if (rule.pattern.test(sanitizedText)) {
      removedFields.add(rule.label);
      sanitizedText = sanitizedText.replace(rule.pattern, rule.replacement);
    }
    rule.pattern.lastIndex = 0;
  }

  return {
    sanitizedText,
    removedFields: [...removedFields]
  };
}

export function sanitizeAxiaContext(context: AxiaPmeBudgetContext): AxiaContextSanitizationResult {
  const removedFields: string[] = [];
  const sanitizedContext: AxiaPmeBudgetContext = {
    ...(typeof context.budgetId === "undefined" ? {} : { budgetId: context.budgetId }),
    ...(typeof context.budgetNumber === "undefined" ? {} : { budgetNumber: context.budgetNumber }),
    ...(typeof context.budgetType === "undefined" ? {} : { budgetType: context.budgetType }),
    ...(typeof context.status === "undefined" ? {} : { status: context.status }),
    ...(typeof context.title === "undefined"
      ? {}
      : { title: sanitizeValue(context.title, removedFields) }),
    ...(typeof context.description === "undefined"
      ? {}
      : { description: sanitizeValue(context.description, removedFields) }),
    ...(typeof context.environments === "undefined"
      ? {}
      : {
          environments: context.environments.map((environment) => ({
            name: sanitizeValue(environment.name, removedFields),
            ...(typeof environment.description === "undefined"
              ? {}
              : {
                  description:
                    typeof environment.description === "string"
                      ? sanitizeValue(environment.description, removedFields)
                      : environment.description
                })
          }))
        }),
    ...(typeof context.items === "undefined" ? {} : { items: context.items }),
    ...(typeof context.totals === "undefined" ? {} : { totals: context.totals }),
    ...(typeof context.paymentTerms === "undefined" ? {} : { paymentTerms: context.paymentTerms }),
    ...(typeof context.sinapiReferences === "undefined"
      ? {}
      : { sinapiReferences: context.sinapiReferences })
  };

  return {
    sanitizedContext,
    removedFields: unique(removedFields),
    redactionSummary: countFields(removedFields)
  };
}

export function buildAxiaPmeAssistantResponse(
  input: AxiaPmeAssistantInput
): AxiaPmeAssistantResponse {
  const sanitizedMessage = sanitizeAxiaText(input.userMessage).sanitizedText;

  if (input.actionType === "create_budget_draft") {
    return buildResponse("Rascunho criado para validação humana.", [
      {
        type: "budget_draft",
        title: "Rascunho inicial de orçamento",
        description:
          "Sugeri ambientes e serviços comuns para uma reforma PME. Revise quantidades e preços.",
        severity: "medium",
        confidenceScore: 0.74,
        status: "draft",
        items: [
          {
            suggestedAction: "create_environment",
            payload: {
              name: inferEnvironmentName(sanitizedMessage),
              description: "Ambiente sugerido pela Axia"
            }
          },
          ...buildBathroomDraftItems(sanitizedMessage).map((description) => ({
            suggestedAction: "create_budget_item" as const,
            payload: {
              description,
              category: "servico",
              unit: description.includes("pintura") ? "m2" : "un",
              quantity: "1",
              sourceType: "axia_suggestion",
              status: "suggested"
            }
          }))
        ]
      }
    ]);
  }

  if (input.actionType === "review_budget_margin") {
    const profit = Number(input.context.totals?.profitPercentage ?? "0");
    const finalPrice = Number(input.context.totals?.finalPrice ?? "0");
    const subtotalCost = Number(input.context.totals?.subtotalCost ?? "0");
    const hasLowMargin = profit > 0 && profit < 15;
    const priceBelowCost = finalPrice > 0 && subtotalCost > 0 && finalPrice < subtotalCost;

    return buildResponse("Revisei margem e preço de venda como alerta consultivo.", [
      {
        type: hasLowMargin || priceBelowCost ? "margin_alert" : "risk_alert",
        title: hasLowMargin ? "Margem baixa para reforma PME" : "Margem sem alerta crítico",
        description: priceBelowCost
          ? "O preço de venda parece menor que o custo interno. Revise antes de enviar ao cliente."
          : hasLowMargin
            ? "A margem informada parece baixa para cobrir retrabalho, perdas, impostos e administração."
            : "Não identifiquei alerta crítico com os dados disponíveis.",
        severity: priceBelowCost ? "critical" : hasLowMargin ? "high" : "low",
        confidenceScore: 0.82,
        status: "suggested",
        items: [
          {
            suggestedAction: "update_margin_warning",
            payload: {
              profitPercentage: input.context.totals?.profitPercentage ?? "0",
              finalPrice: input.context.totals?.finalPrice ?? "0",
              subtotalCost: input.context.totals?.subtotalCost ?? "0"
            }
          }
        ]
      }
    ]);
  }

  if (input.actionType === "compare_with_sinapi") {
    const references = input.context.sinapiReferences ?? [];
    return buildResponse(
      references.length > 0
        ? "Comparei os itens com snapshots SINAPI disponíveis no orçamento."
        : "Não há referência SINAPI disponível no contexto deste orçamento.",
      [
        {
          type: "sinapi_comparison",
          title: "Comparação SINAPI consultiva",
          description:
            references.length > 0
              ? "Use o SINAPI como referência técnica, não como preço obrigatório. Não consultei preços novos."
              : "Não inventei código SINAPI porque não há snapshot ou referência disponível.",
          severity: "low",
          confidenceScore: references.length > 0 ? 0.78 : 0.95,
          status: "suggested",
          items: [{ suggestedAction: "add_note", payload: { references } }]
        }
      ]
    );
  }

  if (input.actionType === "generate_proposal_text") {
    return buildResponse("Texto comercial criado sem expor custo interno ou margem.", [
      {
        type: "proposal_text",
        title: "Texto comercial para proposta",
        description: "Rascunho editável para apresentar escopo e valor ao cliente.",
        severity: "low",
        confidenceScore: 0.86,
        status: "draft",
        items: [
          {
            suggestedAction: "create_proposal_text",
            payload: {
              text: `Olá! Preparamos a proposta "${input.context.title ?? "Orçamento PME"}" com escopo organizado, serviços previstos e condições combinadas. O valor apresentado considera a execução planejada e a validade do orçamento.`
            }
          }
        ]
      }
    ]);
  }

  if (input.actionType === "generate_execution_checklist") {
    return buildResponse("Checklist prático sugerido para organizar a execução.", [
      {
        type: "execution_checklist",
        title: "Checklist de execução",
        description: "Etapas sugeridas para preparação, execução, conferência e entrega.",
        severity: "low",
        confidenceScore: 0.8,
        status: "suggested",
        items: [
          "Confirmar escopo aprovado",
          "Registrar fotos antes do início",
          "Conferir materiais críticos",
          "Validar execução por ambiente",
          "Fazer limpeza final e entrega"
        ].map((label) => ({
          suggestedAction: "create_checklist_item" as const,
          payload: { label }
        }))
      }
    ]);
  }

  if (input.actionType === "explain_budget_to_client") {
    return buildResponse("Explicação simples criada sem custo interno, margem ou lucro.", [
      {
        type: "client_explanation",
        title: "Explicação para o cliente",
        description:
          "Este orçamento organiza os serviços por etapas para facilitar o acompanhamento da reforma. O valor considera o escopo descrito, materiais/serviços previstos e condições de pagamento informadas.",
        severity: "low",
        confidenceScore: 0.84,
        status: "draft",
        items: [{ suggestedAction: "add_note", payload: { audience: "cliente_final" } }]
      }
    ]);
  }

  return buildResponse("Analisei lacunas comuns em orçamento PME.", [
    {
      type: "missing_item",
      title: "Itens que podem estar faltando",
      description: "Verifique itens comuns que costumam gerar retrabalho em reformas pequenas.",
      severity: "medium",
      confidenceScore: 0.72,
      status: "suggested",
      items: [
        "Proteção de piso e móveis",
        "Remoção de entulho",
        "Impermeabilização quando houver área molhada",
        "Teste hidráulico ou elétrico",
        "Limpeza final"
      ].map((description) => ({
        suggestedAction: "create_budget_item" as const,
        payload: {
          description,
          category: "servico",
          unit: "un",
          quantity: "1",
          sourceType: "axia_suggestion",
          status: "suggested"
        }
      }))
    }
  ]);
}

export function toLegacyInsights(response: AxiaPmeAssistantResponse): AxiaPmeInsight[] {
  return response.suggestions.map((suggestion) => ({
    type: suggestion.type,
    status: "suggested",
    title: suggestion.title,
    summary: suggestion.description,
    evidence: ["Resposta consultiva: nenhuma alteração oficial foi executada."],
    suggestedPayload: { items: suggestion.items.map(toSuggestionItemJson) }
  }));
}

function toSuggestionItemJson(item: AxiaPmeSuggestionItem): AxiaJson {
  return {
    suggestedAction: item.suggestedAction,
    payload: item.payload
  };
}

function buildResponse(
  summary: string,
  suggestions: AxiaPmeSuggestion[],
  warnings: string[] = []
): AxiaPmeAssistantResponse {
  return {
    summary,
    suggestions,
    warnings: [
      "A Axia gera sugestões para validação humana.",
      "A Axia não aprova orçamento.",
      "A Axia não altera automaticamente dados oficiais.",
      "Nenhum orçamento foi aprovado, convertido ou alterado automaticamente.",
      ...warnings
    ],
    humanValidationRequired: true
  };
}

function inferEnvironmentName(text: string): string {
  return text.toLocaleLowerCase("pt-BR").includes("banheiro") ? "Banheiro" : "Ambiente principal";
}

function buildBathroomDraftItems(text: string): string[] {
  if (!text.toLocaleLowerCase("pt-BR").includes("banheiro")) {
    return ["Levantamento do local", "Execução dos serviços descritos", "Limpeza final"];
  }

  return [
    "Proteção do local",
    "Demolição e remoção de revestimentos",
    "Remoção de entulho",
    "Revisão hidráulica",
    "Revisão elétrica",
    "Impermeabilização",
    "Contrapiso",
    "Assentamento de piso",
    "Assentamento de revestimento",
    "Rejuntamento",
    "Instalação de louças e metais",
    "Instalação de box",
    "Pintura",
    "Limpeza final"
  ];
}

function sanitizeValue(value: string, removedFields: string[]): string {
  const result = sanitizeAxiaText(value);
  removedFields.push(...result.removedFields);
  return result.sanitizedText;
}

function countFields(fields: string[]): Record<string, number> {
  return fields.reduce<Record<string, number>>((summary, field) => {
    summary[field] = (summary[field] ?? 0) + 1;
    return summary;
  }, {});
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
