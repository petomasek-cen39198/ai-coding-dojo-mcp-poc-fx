import axios from "axios";
import type { BankRates, ExchangeRate } from "../types.js";

// CSAS (Česká spořitelna) public exchange rates API
// No authentication required for public exchange rate data
const CSAS_EXCHANGE_RATES_URL =
  "https://www.csas.cz/webapi/api/v3/exchangerates";

interface CSASRate {
  currencyCode: string;
  nameI18N: string;
  buy: number;
  sell: number;
  middle: number;
  valDate: string;
  move: string;
  moveDescription: string;
}

interface CSASResponse {
  exchangeRates: CSASRate[];
}

export async function fetchCSASRates(): Promise<BankRates> {
  const fetchedAt = new Date().toISOString();

  try {
    const response = await axios.get<CSASResponse>(CSAS_EXCHANGE_RATES_URL, {
      headers: {
        Accept: "application/json",
        "WEB-API-key": "tryit-web-api-key",
      },
      timeout: 10000,
    });

    const rates: ExchangeRate[] = response.data.exchangeRates.map((r) => ({
      currency: r.nameI18N,
      currencyCode: r.currencyCode,
      buy: r.buy ?? null,
      sell: r.sell ?? null,
      middle: r.middle ?? null,
      validAt: r.valDate,
    }));

    return {
      bank: "Česká spořitelna",
      bankCode: "CSAS",
      rates,
      fetchedAt,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      bank: "Česká spořitelna",
      bankCode: "CSAS",
      rates: [],
      fetchedAt,
      error: `Failed to fetch CSAS rates: ${message}`,
    };
  }
}
