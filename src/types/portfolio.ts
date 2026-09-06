export interface Portfolio {
  /** UUID + portfolio name (PortfolioController) — a string, and not URL-safe */
  portfolioId: string;
  portfolioName: string;
  description?: string;
}

export interface CreatePortfolioPayload {
  portfolioName: string;
  description: string;
}
