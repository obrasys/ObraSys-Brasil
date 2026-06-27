const MONEY_SCALE = 100n;
const QUANTITY_SCALE = 10_000n;
const PERCENT_SCALE = 10_000n;
const PERCENT_DENOMINATOR = 100n * PERCENT_SCALE;

export interface PmeBudgetCalculationItemInput {
  id?: string;
  description: string;
  kind:
    | "service"
    | "material"
    | "labor"
    | "third_party"
    | "servico"
    | "mao_de_obra"
    | "terceiro"
    | "equipamento"
    | "transporte"
    | "descarte"
    | "taxa"
    | "composicao"
    | "outro";
  quantity: string;
  unitCost: string;
  unitPrice: string;
}

export interface PmeBudgetCalculationInput {
  items: PmeBudgetCalculationItemInput[];
  overheadPercentage: string;
  taxPercentage: string;
  profitPercentage: string;
  discountAmount: string;
}

export interface PmeBudgetCalculationItemResult extends PmeBudgetCalculationItemInput {
  totalCost: string;
  totalPrice: string;
}

export interface PmeBudgetCalculationResult {
  items: PmeBudgetCalculationItemResult[];
  subtotalCost: string;
  subtotalPrice: string;
  overheadAmount: string;
  taxAmount: string;
  profitAmount: string;
  discountAmount: string;
  finalPrice: string;
}

interface ParsedItem {
  input: PmeBudgetCalculationItemInput;
  quantityUnits: bigint;
  unitCostCents: bigint;
  unitPriceCents: bigint;
}

export function calculatePmeBudget(input: PmeBudgetCalculationInput): PmeBudgetCalculationResult {
  const parsedItems = input.items.map(parseItem);
  const overheadRate = parseScaledDecimal(input.overheadPercentage, 4, "overheadPercentage");
  const taxRate = parseScaledDecimal(input.taxPercentage, 4, "taxPercentage");
  const profitRate = parseScaledDecimal(input.profitPercentage, 4, "profitPercentage");
  const discountCents = parseMoney(input.discountAmount, "discountAmount");

  const calculatedItems = parsedItems.map((item) => {
    const totalCostCents = multiplyQuantityByMoney(item.quantityUnits, item.unitCostCents);
    const totalPriceCents = multiplyQuantityByMoney(item.quantityUnits, item.unitPriceCents);

    return {
      ...item.input,
      totalCost: formatMoney(totalCostCents),
      totalPrice: formatMoney(totalPriceCents)
    };
  });

  const subtotalCostCents = parsedItems.reduce(
    (total, item) => total + multiplyQuantityByMoney(item.quantityUnits, item.unitCostCents),
    0n
  );
  const subtotalPriceCents = parsedItems.reduce(
    (total, item) => total + multiplyQuantityByMoney(item.quantityUnits, item.unitPriceCents),
    0n
  );
  const overheadAmountCents = applyPercentage(subtotalCostCents, overheadRate);
  const taxAmountCents = applyPercentage(subtotalCostCents, taxRate);
  const profitAmountCents = applyPercentage(subtotalCostCents, profitRate);
  const finalPriceCents =
    subtotalCostCents + overheadAmountCents + taxAmountCents + profitAmountCents - discountCents;

  if (finalPriceCents < 0n) {
    throw new Error("finalPrice cannot be negative.");
  }

  return {
    items: calculatedItems,
    subtotalCost: formatMoney(subtotalCostCents),
    subtotalPrice: formatMoney(subtotalPriceCents),
    overheadAmount: formatMoney(overheadAmountCents),
    taxAmount: formatMoney(taxAmountCents),
    profitAmount: formatMoney(profitAmountCents),
    discountAmount: formatMoney(discountCents),
    finalPrice: formatMoney(finalPriceCents)
  };
}

function parseItem(input: PmeBudgetCalculationItemInput): ParsedItem {
  return {
    input,
    quantityUnits: parseScaledDecimal(input.quantity, 4, "quantity"),
    unitCostCents: parseMoney(input.unitCost, "unitCost"),
    unitPriceCents: parseMoney(input.unitPrice, "unitPrice")
  };
}

function parseMoney(value: string, fieldName: string): bigint {
  return parseScaledDecimal(value, 2, fieldName);
}

function parseScaledDecimal(value: string, scale: number, fieldName: string): bigint {
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error(`${fieldName} must be a non-negative decimal string.`);
  }

  const [integerPart, decimalPart = ""] = value.split(".");
  if (decimalPart.length > scale) {
    throw new Error(`${fieldName} cannot have more than ${scale} decimal places.`);
  }

  const paddedDecimal = decimalPart.padEnd(scale, "0");
  return BigInt(integerPart + paddedDecimal);
}

function multiplyQuantityByMoney(quantityUnits: bigint, moneyCents: bigint): bigint {
  return divideRounded(quantityUnits * moneyCents, QUANTITY_SCALE);
}

function applyPercentage(amountCents: bigint, percentageUnits: bigint): bigint {
  return divideRounded(amountCents * percentageUnits, PERCENT_DENOMINATOR);
}

function divideRounded(value: bigint, divisor: bigint): bigint {
  const quotient = value / divisor;
  const remainder = value % divisor;
  return remainder * 2n >= divisor ? quotient + 1n : quotient;
}

function formatMoney(cents: bigint): string {
  const reais = cents / MONEY_SCALE;
  const centavos = cents % MONEY_SCALE;
  return `${reais}.${centavos.toString().padStart(2, "0")}`;
}
