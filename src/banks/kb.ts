import axios from "axios";
import * as cheerio from "cheerio";
import type { BankRates, ExchangeRate } from "../types.js";

// KB (Komerční banka) exchange rates – scraped from their public web page
// KB does not expose a public unauthenticated REST API for exchange rates
const KB_EXCHANGE_RATES_URL =
  "https://www.kb.cz/cs/kurzy-a-sazby/devizove-kurzy-kb";

export async function fetchKBRates(): Promise<BankRates> {
  const fetchedAt = new Date().toISOString();

  try {
    const response = await axios.get<string>(KB_EXCHANGE_RATES_URL, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; MCP-Exchange-Rates-Bot/1.0)",
        "Accept-Language": "cs,en;q=0.5",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const rates: ExchangeRate[] = [];

    // KB renders exchange rates in a table with class "table" or similar
    // Rows typically contain: currency name, currency code, buy rate, sell rate, CNB rate
    $("table tr").each((_i, row) => {
      const cells = $(row).find("td");
      if (cells.length < 4) return;

      const currencyName = $(cells[0]).text().trim();
      const currencyCode = $(cells[1]).text().trim();
      const buyText = $(cells[2]).text().trim().replace(",", ".");
      const sellText = $(cells[3]).text().trim().replace(",", ".");

      if (!currencyCode || currencyCode.length !== 3) return;
      // Skip header-like rows
      if (!/^[A-Z]{3}$/.test(currencyCode)) return;

      const buy = parseFloat(buyText);
      const sell = parseFloat(sellText);

      rates.push({
        currency: currencyName,
        currencyCode,
        buy: isNaN(buy) ? null : buy,
        sell: isNaN(sell) ? null : sell,
        middle: null,
      });
    });

    if (rates.length === 0) {
      return {
        bank: "Komerční banka",
        bankCode: "KB",
        rates: [],
        fetchedAt,
        error:
          "No exchange rates could be parsed from KB website – page structure may have changed",
      };
    }

    return {
      bank: "Komerční banka",
      bankCode: "KB",
      rates,
      fetchedAt,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      bank: "Komerční banka",
      bankCode: "KB",
      rates: [],
      fetchedAt,
      error: `Failed to fetch KB rates: ${message}`,
    };
  }
}
