interface SkeletonRowProps {
  cols: number;
  rows?: number;
}

export default function SkeletonRow({ cols, rows = 8 }: SkeletonRowProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-6 py-4">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
