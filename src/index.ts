import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchCSASRates } from "./banks/csas.js";
import { fetchKBRates } from "./banks/kb.js";
import { fetchRBRates } from "./banks/rb.js";
import type { BankRates, BestRate } from "./types.js";

const server = new McpServer({
  name: "czech-banks-exchange-rates",
  version: "1.0.0",
});

// ──────────────────────────────────────────────────────────────────────────────
// Helper: fetch rates from all banks concurrently
// ──────────────────────────────────────────────────────────────────────────────
async function fetchAllBankRates(): Promise<BankRates[]> {
  const [csas, kb, rb] = await Promise.all([
    fetchCSASRates(),
    fetchKBRates(),
    fetchRBRates(),
  ]);
  return [csas, kb, rb];
}

// ──────────────────────────────────────────────────────────────────────────────
// Tool: get_all_rates
// Returns all exchange rates from all three banks
// ──────────────────────────────────────────────────────────────────────────────
server.tool(
  "get_all_rates",
  "Retrieve exchange rates from all three Czech banks (CSAS, KB, RB) simultaneously. Returns buy and sell rates for all available currencies.",
  {},
  async () => {
    const allRates = await fetchAllBankRates();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(allRates, null, 2),
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Tool: get_bank_rates
// Returns exchange rates from a specific bank
// ──────────────────────────────────────────────────────────────────────────────
server.tool(
  "get_bank_rates",
  "Retrieve exchange rates from a specific Czech bank. Choose from CSAS (Česká spořitelna), KB (Komerční banka), or RB (Raiffeisenbank).",
  {
    bank: z
      .enum(["CSAS", "KB", "RB"])
      .describe(
        "Bank code: CSAS = Česká spořitelna, KB = Komerční banka, RB = Raiffeisenbank"
      ),
  },
  async ({ bank }) => {
    let rates: BankRates;
    switch (bank) {
      case "CSAS":
        rates = await fetchCSASRates();
        break;
      case "KB":
        rates = await fetchKBRates();
        break;
      case "RB":
        rates = await fetchRBRates();
        break;
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(rates, null, 2),
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Tool: get_best_rate
// Finds the best buy or sell rate for a given currency across all banks
// ──────────────────────────────────────────────────────────────────────────────
server.tool(
  "get_best_rate",
  "Find the best exchange rate for a specific currency across all three Czech banks. For buying foreign currency (you spend CZK), a lower sell rate is better. For selling foreign currency (you receive CZK), a higher buy rate is better.",
  {
    currencyCode: z
      .string()
      .length(3)
      .toUpperCase()
      .describe(
        "ISO 4217 currency code, e.g. USD, EUR, GBP, CHF, JPY, PLN, HUF, etc."
      ),
    action: z
      .enum(["buy", "sell"])
      .describe(
        "Direction from the CLIENT perspective: 'buy' = you want to buy foreign currency (bank sells, you pay CZK), 'sell' = you want to sell foreign currency (bank buys, you receive CZK)"
      ),
  },
  async ({ currencyCode, action }) => {
    const code = currencyCode.toUpperCase();
    const allRates = await fetchAllBankRates();

    // From the bank's perspective: when client "buys" foreign currency, bank "sells" it
    // When client "sells" foreign currency, bank "buys" it
    const bankField = action === "buy" ? "sell" : "buy";

    const comparison = allRates.map((bankData) => {
      const rateEntry = bankData.rates.find((r) => r.currencyCode === code);
      const rate = rateEntry ? (rateEntry[bankField] ?? null) : null;
      return {
        bank: bankData.bank,
        bankCode: bankData.bankCode,
        rate,
        error: bankData.error,
      };
    });

    const validRates = comparison.filter(
      (r): r is typeof r & { rate: number } => r.rate !== null
    );

    if (validRates.length === 0) {
      const result = {
        currencyCode: code,
        action,
        message: `No rates found for ${code}. The currency may not be supported or all banks returned errors.`,
        allRates: comparison,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    // Best buy rate for client = lowest sell rate from bank
    // Best sell rate for client = highest buy rate from bank
    const bestEntry =
      action === "buy"
        ? validRates.reduce((a, b) => (a.rate < b.rate ? a : b))
        : validRates.reduce((a, b) => (a.rate > b.rate ? a : b));

    const result: BestRate = {
      currencyCode: code,
      action,
      bestBank: bestEntry.bank,
      bestBankCode: bestEntry.bankCode,
      bestRate: bestEntry.rate,
      allRates: comparison.map(({ bank, bankCode, rate }) => ({
        bank,
        bankCode,
        rate,
      })),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Tool: compare_rates
// Compare a specific currency across all banks side by side
// ──────────────────────────────────────────────────────────────────────────────
server.tool(
  "compare_rates",
  "Compare buy and sell rates for a specific currency across all three Czech banks side by side.",
  {
    currencyCode: z
      .string()
      .length(3)
      .toUpperCase()
      .describe("ISO 4217 currency code, e.g. USD, EUR, GBP"),
  },
  async ({ currencyCode }) => {
    const code = currencyCode.toUpperCase();
    const allRates = await fetchAllBankRates();

    const comparison = allRates.map((bankData) => {
      const rateEntry = bankData.rates.find((r) => r.currencyCode === code);
      return {
        bank: bankData.bank,
        bankCode: bankData.bankCode,
        buy: rateEntry?.buy ?? null,
        sell: rateEntry?.sell ?? null,
        middle: rateEntry?.middle ?? null,
        validAt: rateEntry?.validAt ?? null,
        error: bankData.error ?? null,
      };
    });

    const hasAnyRate = comparison.some(
      (r) => r.buy !== null || r.sell !== null
    );

    const result = {
      currencyCode: code,
      fetchedAt: new Date().toISOString(),
      found: hasAnyRate,
      banks: comparison,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Start server
// ──────────────────────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // MCP servers communicate over stdio – no console.log to avoid protocol pollution
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${String(err)}\n`);
  process.exit(1);
});
