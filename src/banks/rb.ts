import axios from "axios";
import * as cheerio from "cheerio";
import type { BankRates, ExchangeRate } from "../types.js";

// RB (Raiffeisenbank) exchange rates – scraped from their public web page
// Raiffeisenbank does not expose a public unauthenticated REST API
const RB_EXCHANGE_RATES_URL =
  "https://www.rb.cz/osobni/sporeni-a-investice/vymena-men";

export async function fetchRBRates(): Promise<BankRates> {
  const fetchedAt = new Date().toISOString();

  try {
    const response = await axios.get<string>(RB_EXCHANGE_RATES_URL, {
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

    // RB renders exchange rates in a table on their currency exchange page.
    // Table columns are typically: currency, code, buy, sell, CNB
    $("table tr, .exchange-rate-table tr, .rates-table tr").each(
      (_i, row) => {
        const cells = $(row).find("td");
        if (cells.length < 4) return;

        const currencyName = $(cells[0]).text().trim();
        const currencyCode = $(cells[1]).text().trim();
        const buyText = $(cells[2]).text().trim().replace(",", ".");
        const sellText = $(cells[3]).text().trim().replace(",", ".");

        if (!currencyCode || !/^[A-Z]{3}$/.test(currencyCode)) return;

        const buy = parseFloat(buyText);
        const sell = parseFloat(sellText);

        rates.push({
          currency: currencyName,
          currencyCode,
          buy: isNaN(buy) ? null : buy,
          sell: isNaN(sell) ? null : sell,
          middle: null,
        });
      }
    );

    if (rates.length === 0) {
      return {
        bank: "Raiffeisenbank",
        bankCode: "RB",
        rates: [],
        fetchedAt,
        error:
          "No exchange rates could be parsed from RB website – page structure may have changed",
      };
    }

    return {
      bank: "Raiffeisenbank",
      bankCode: "RB",
      rates,
      fetchedAt,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      bank: "Raiffeisenbank",
      bankCode: "RB",
      rates: [],
      fetchedAt,
      error: `Failed to fetch RB rates: ${message}`,
    };
  }
}
