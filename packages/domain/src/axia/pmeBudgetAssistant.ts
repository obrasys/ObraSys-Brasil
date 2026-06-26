export type AxiaPmeTask =
  | "suggest_missing_items"
  | "draft_from_text"
  | "draft_from_renovation_description"
  | "suggest_environments_services"
  | "low_margin_alert"
  | "compare_sinapi_reference"
  | "commercial_proposal_text"
  | "execution_checklist";

export type AxiaInsightType =
  | "missing_item"
  | "draft_budget"
  | "environment_service"
  | "margin_alert"
  | "sinapi_comparison"
  | "commercial_text"
  | "execution_checklist";

export type AxiaSuggestionStatus = "draft" | "suggested";

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

export interface AxiaPmeBudgetContext {
  budgetId?: string;
  title?: string;
  description?: string;
  budgetNumber?: string;
  status?: string;
  environments?: Array<{
    name: string;
    description?: string | null;
  }>;
  items?: Array<{
    description: string;
    itemType?: string;
    unit?: string;
    quantity?: string;
    showOnProposal?: boolean;
  }>;
  totals?: {
    subtotalCost?: string;
    finalPrice?: string;
    profitPercentage?: string;
    taxPercentage?: string;
  };
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
  task: AxiaPmeTask;
  userText: string;
  context: AxiaPmeBudgetContext;
}

export interface AxiaPmeInsight {
  type: AxiaInsightType;
  status: AxiaSuggestionStatus;
  title: string;
  summary: string;
  evidence: string[];
  suggestedPayload: AxiaJson;
}

export interface AxiaPmeAssistantResponse {
  task: AxiaPmeTask;
  status: AxiaSuggestionStatus;
  message: string;
  insights: AxiaPmeInsight[];
  guardrails: string[];
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

export function sanitizeAxiaContext(context: AxiaPmeBudgetContext): {
  sanitizedContext: AxiaPmeBudgetContext;
  removedFields: string[];
} {
  const removedFields: string[] = [];
  const sanitizedContext: AxiaPmeBudgetContext = {
    ...(typeof context.budgetId === "undefined" ? {} : { budgetId: context.budgetId }),
    ...(typeof context.title === "undefined"
      ? {}
      : { title: sanitizeAxiaText(context.title).sanitizedText }),
    ...(typeof context.description === "undefined"
      ? {}
      : { description: sanitizeAxiaText(context.description).sanitizedText }),
    ...(typeof context.budgetNumber === "undefined" ? {} : { budgetNumber: context.budgetNumber }),
    ...(typeof context.status === "undefined" ? {} : { status: context.status }),
    ...(typeof context.environments === "undefined"
      ? {}
      : {
          environments: context.environments.map((environment) => ({
            name: sanitizeAxiaText(environment.name).sanitizedText,
            ...(typeof environment.description === "undefined"
              ? {}
              : {
                  description:
                    typeof environment.description === "string"
                      ? sanitizeAxiaText(environment.description).sanitizedText
                      : environment.description
                })
          }))
        }),
    ...(typeof context.items === "undefined" ? {} : { items: context.items }),
    ...(typeof context.totals === "undefined" ? {} : { totals: context.totals }),
    ...(typeof context.sinapiReferences === "undefined"
      ? {}
      : { sinapiReferences: context.sinapiReferences })
  };

  for (const value of [context.title, context.description]) {
    if (typeof value === "string") {
      removedFields.push(...sanitizeAxiaText(value).removedFields);
    }
  }

  for (const environment of context.environments ?? []) {
    removedFields.push(...sanitizeAxiaText(environment.name).removedFields);
    if (typeof environment.description === "string") {
      removedFields.push(...sanitizeAxiaText(environment.description).removedFields);
    }
  }

  return {
    sanitizedContext,
    removedFields: unique(removedFields)
  };
}

export function buildAxiaPmeAssistantResponse(
  input: AxiaPmeAssistantInput
): AxiaPmeAssistantResponse {
  const sanitized = sanitizeAxiaText(input.userText);
  const baseEvidence = [
    "Resposta consultiva: nenhuma alteração oficial foi executada.",
    "Sugestões marcadas como draft ou suggested para validação humana."
  ];

  if (input.task === "low_margin_alert") {
    const profit = input.context.totals?.profitPercentage ?? "0";
    const isLow = Number(profit) > 0 && Number(profit) < 15;
    return response(input.task, [
      {
        type: "margin_alert",
        status: "suggested",
        title: isLow ? "Margem abaixo do recomendável" : "Margem sem alerta crítico",
        summary: isLow
          ? "A margem informada parece baixa para uma reforma PME. Revise risco, retrabalho e impostos antes de enviar."
          : "Não identifiquei margem baixa com os dados resumidos disponíveis.",
        evidence: [...baseEvidence, `Margem informada: ${profit}%`],
        suggestedPayload: { profitPercentage: profit, severity: isLow ? "medium" : "info" }
      }
    ]);
  }

  if (input.task === "commercial_proposal_text") {
    return response(input.task, [
      {
        type: "commercial_text",
        status: "draft",
        title: "Texto comercial sugerido",
        summary:
          "Segue rascunho de texto para proposta, sem expor custo interno, margem ou preço mínimo.",
        evidence: baseEvidence,
        suggestedPayload: {
          text: `Olá! Preparamos uma proposta para ${input.context.title ?? "sua reforma"} com escopo organizado por etapas, materiais e mão de obra. O valor apresentado considera execução planejada, condições combinadas e prazo de validade do orçamento.`
        }
      }
    ]);
  }

  if (input.task === "execution_checklist") {
    return response(input.task, [
      {
        type: "execution_checklist",
        status: "suggested",
        title: "Checklist inicial de execução",
        summary: "Checklist prático para validar antes de iniciar a obra.",
        evidence: baseEvidence,
        suggestedPayload: {
          items: [
            "Confirmar escopo aprovado com o cliente",
            "Validar compra de materiais críticos",
            "Agendar mão de obra",
            "Registrar fotos do local antes do início",
            "Conferir condições de pagamento"
          ]
        }
      }
    ]);
  }

  if (input.task === "compare_sinapi_reference") {
    return response(input.task, [
      {
        type: "sinapi_comparison",
        status: "suggested",
        title: "Comparação com referência SINAPI",
        summary:
          input.context.sinapiReferences && input.context.sinapiReferences.length > 0
            ? "Há referências SINAPI disponíveis para comparação. Use como referência técnica, não como preço obrigatório."
            : "Não encontrei referência SINAPI no contexto sanitizado deste orçamento.",
        evidence: [
          ...baseEvidence,
          `Referências SINAPI encontradas: ${input.context.sinapiReferences?.length ?? 0}`
        ],
        suggestedPayload: { references: input.context.sinapiReferences ?? [] }
      }
    ]);
  }

  if (input.task === "draft_from_text" || input.task === "draft_from_renovation_description") {
    return response(input.task, [
      {
        type: "draft_budget",
        status: "draft",
        title: "Rascunho inicial de orçamento",
        summary:
          "Rascunho criado a partir do texto sanitizado. Revise itens, quantidades e preços.",
        evidence: [...baseEvidence, "Texto livre foi sanitizado antes de gerar sugestão."],
        suggestedPayload: {
          title: extractTitle(sanitized.sanitizedText),
          environments: ["Ambiente principal"],
          services: ["Levantamento do local", "Execução dos serviços descritos", "Limpeza final"]
        }
      }
    ]);
  }

  if (input.task === "suggest_environments_services") {
    return response(input.task, [
      {
        type: "environment_service",
        status: "suggested",
        title: "Ambientes e serviços sugeridos",
        summary: "Sugestões para organizar o orçamento em uma leitura simples para PME.",
        evidence: baseEvidence,
        suggestedPayload: {
          environments: ["Preparação", "Execução", "Acabamento"],
          services: ["Proteção do local", "Serviço principal", "Revisão e limpeza"]
        }
      }
    ]);
  }

  return response(input.task, [
    {
      type: "missing_item",
      status: "suggested",
      title: "Itens que podem estar faltando",
      summary: "Verifique itens comuns que costumam gerar retrabalho em reformas pequenas.",
      evidence: baseEvidence,
      suggestedPayload: {
        items: ["Proteção de piso e móveis", "Remoção e descarte", "Transporte", "Limpeza final"]
      }
    }
  ]);
}

function response(task: AxiaPmeTask, insights: AxiaPmeInsight[]): AxiaPmeAssistantResponse {
  return {
    task,
    status: "suggested",
    message: "Sugestões geradas para revisão humana. Nenhum dado oficial foi alterado.",
    insights,
    guardrails: [
      "Axia não aprova orçamento.",
      "Axia não altera preço final.",
      "Axia não converte orçamento em obra.",
      "Sugestões precisam de validação humana."
    ]
  };
}

function extractTitle(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return "Rascunho de orçamento PME";
  }

  return trimmed.slice(0, 80);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
