import { useState } from 'react';

interface Props {
  ticker: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { outer: 'h-7 w-7', img: 'h-5 w-5', text: 'text-xs' },
  md: { outer: 'h-8 w-8', img: 'h-6 w-6', text: 'text-xs' },
  lg: { outer: 'h-12 w-12', img: 'h-10 w-10', text: 'text-sm' },
};

export default function StockLogo({ ticker, size = 'md' }: Props) {
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

  const { outer, img, text } = sizeMap[size];

  if (failed) {
    return (
      <div className={`${outer} shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center`}>
        <span className={`${text} font-bold text-slate-500 dark:text-slate-300`}>{ticker.substring(0, 2)}</span>
      </div>
    );
  }

  return (
    <div className={`${outer} shrink-0 rounded-full bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 overflow-hidden flex items-center justify-center`}>
      <img
        src={src}
        alt={ticker}
        className={`${img} object-contain`}
        onError={handleError}
      />
    </div>
  );
}
