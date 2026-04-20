import { useState } from 'react';
import type { AssetType } from '../../types/holding';

interface Props {
  ticker: string;
  name?: string | null;
  assetType?: AssetType | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { outer: 'h-7 w-7', img: 'h-5 w-5', text: 'text-xs' },
  md: { outer: 'h-8 w-8', img: 'h-6 w-6', text: 'text-xs' },
  lg: { outer: 'h-12 w-12', img: 'h-10 w-10', text: 'text-sm' },
};

// Stable color per asset type label so every "COIN" asset gets the same hue
const CUSTOM_COLORS: Record<string, string> = {
  COIN:    'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  FIGURE:  'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  WINE:    'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  ART:     'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300',
};
const DEFAULT_CUSTOM_COLOR = 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300';

function textAvatar(ticker: string, name?: string | null): string {
  const src = name?.trim() || ticker;
  const words = src.split(/[\s\-_]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return src.substring(0, 2).toUpperCase();
}

export default function StockLogo({ ticker, name, assetType, size = 'md' }: Props) {
  const { outer, img, text } = sizeMap[size];

  // Custom assets: skip image fetch, show text avatar immediately
  if (assetType === 'CUSTOM') {
    const colorClass = CUSTOM_COLORS[name?.toUpperCase() ?? ''] ?? DEFAULT_CUSTOM_COLOR;
    return (
      <div className={`${outer} shrink-0 rounded-full ${colorClass} flex items-center justify-center`}>
        <span className={`${text} font-bold`}>{textAvatar(ticker, name)}</span>
      </div>
    );
  }

  const local = `/images/${ticker}_icon.png`;
  const remote = `https://assets.parqet.com/logos/symbol/${ticker}?format=svg`;
  const [src, setSrc] = useState(local);
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    if (src === local) {
      setSrc(remote);
    } else {
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <div className={`${outer} shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center`}>
        <span className={`${text} font-bold text-slate-500 dark:text-slate-300`}>{ticker.substring(0, 2)}</span>
      </div>
    );
  }

  return (
    <div className={`${outer} shrink-0 rounded-full bg-slate-700 dark:bg-white border border-slate-600 dark:border-slate-200 overflow-hidden flex items-center justify-center`}>
      <img
        src={src}
        alt={ticker}
        className={`${img} object-contain`}
        onError={handleError}
      />
    </div>
  );
}
