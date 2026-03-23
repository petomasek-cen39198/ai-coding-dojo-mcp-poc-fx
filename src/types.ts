export interface ExchangeRate {
  currency: string;
  currencyCode: string;
  buy: number | null;
  sell: number | null;
  middle: number | null;
  validAt?: string;
}

export interface BankRates {
  bank: string;
  bankCode: "CSAS" | "KB" | "RB";
  rates: ExchangeRate[];
  fetchedAt: string;
  error?: string;
}

export interface BestRate {
  currencyCode: string;
  action: "buy" | "sell";
  bestBank: string;
  bestBankCode: string;
  bestRate: number;
  allRates: Array<{
    bank: string;
    bankCode: string;
    rate: number | null;
  }>;
}
