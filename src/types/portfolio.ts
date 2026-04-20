export interface Portfolio {
  portfolioId: number;
  portfolioName: string;
  description?: string;
}

export interface CreatePortfolioPayload {
  portfolioName: string;
  description: string;
}
