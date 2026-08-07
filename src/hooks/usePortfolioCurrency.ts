import { useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useFxRates } from './useFxRates';
import { readLocalPortfolioSettings } from '../lib/portfolioSettingsStore';
import { convert, convertMap, formatMoney, normalizeCurrency } from '../lib/currency';
import type { CurrencyDisplay } from '../types/settings';

/**
 * Read side of a portfolio's currency settings: which currency to show money in,
 * how to write it, and the converters that get there. The backend reports every
 * amount in its native currency — conversion happens here, with the rates the
 * client holds.
 *
 * Falls back to the localStorage mirror until the server settings land, so the
 * first paint is already in the right currency.
 */
export function usePortfolioCurrency(portfolioId: string, heldCurrencies: string[] = []) {
  const { getPortfolioSettings } = useSettings();
  const fxRates = useFxRates();
  const server = getPortfolioSettings(portfolioId);

  const saved = useMemo(
    () => server ?? readLocalPortfolioSettings(portfolioId),
    [server, portfolioId]);

  const held = [...new Set(heldCurrencies.filter(Boolean).map(normalizeCurrency))];
  const baseCurrency = saved.baseCurrency
    ?? (held.length === 1 ? held[0] : held.length ? 'USD' : 'USD');
  const currencyDisplay: CurrencyDisplay = saved.currencyDisplay ?? 'Symbol';

  return useMemo(() => ({
    baseCurrency,
    currencyDisplay,
    fxRates,
    /** native amount → base currency */
    toBase: (value: number | null | undefined, from?: string | null) =>
      convert(Number(value) || 0, from ?? baseCurrency, baseCurrency, fxRates),
    /** {currency: nativeAmount} → one total in the base currency */
    sumToBase: (byCurrency: Record<string, number> | null | undefined) =>
      convertMap(byCurrency, baseCurrency, fxRates),
    /** format an amount already in the base currency (or pass its own currency) */
    money: (value: number | null | undefined, currency = baseCurrency, decimals?: number) =>
      formatMoney(value, currency, currencyDisplay, decimals),
  }), [baseCurrency, currencyDisplay, fxRates]);
}
