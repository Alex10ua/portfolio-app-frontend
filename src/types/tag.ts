export interface TickerTags {
  id: string;
  username: string;
  portfolioId: string;
  ticker: string;
  tags: string[];
  updatedAt: string;
}

export interface TagGraphNode {
  id: string;
  nodeType: 'tag' | 'ticker';
  label: string;
  val: number;
}

export interface TagGraphLink {
  source: string;
  target: string;
}
