const PALETTE = [
  '#4F46E5', // indigo
  '#14B8A6', // teal
  '#8B5CF6', // purple
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#0EA5E9', // sky
  '#EC4899', // pink
  '#84CC16', // lime
];

export function tagColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash * 31) + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export { PALETTE };
