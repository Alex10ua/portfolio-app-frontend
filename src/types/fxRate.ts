// currency code → rateVsEur (units of currency per 1 EUR)
// Example: { "USD": 1.10, "EUR": 1.0, "GBP": 0.86 }
// To convert native value to EUR: eurValue = nativeValue / rateVsEur
export type FxRates = Record<string, number>;
