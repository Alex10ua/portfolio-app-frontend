import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Hash, Network, Link, AlertCircle, Search, Plus, Globe } from 'lucide-react';
import { useAllTags } from '../../hooks/useTags';
import { useHoldings } from '../../hooks/useHoldings';
import { tagColor } from '../../lib/tagColors';
import StatCard from '../../components/ui/StatCard';
import type { TickerTags } from '../../types/tag';
import type { Holding } from '../../types/holding';

// ---------- types ----------

interface TagGroup {
  name: string;
  color: string;
  tickers: string[];
}

interface GraphNode {
  id: string;
  type: 'tag' | 'ticker';
  label: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

interface GraphEdge {
  from: string;
  to: string;
  color: string;
  a: GraphNode;
  b: GraphNode;
}

// ---------- dark mode observer ----------

function useIsDark() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// ---------- build tag groups ----------

function buildTagGroups(data: TickerTags[]): TagGroup[] {
  const map = new Map<string, string[]>();
  for (const doc of data) {
    for (const tag of doc.tags) {
      const list = map.get(tag) ?? [];
      list.push(doc.ticker);
      map.set(tag, list);
    }
  }
  return [...map.entries()].map(([name, tickers]) => ({
    name,
    color: tagColor(name),
    tickers,
  }));
}

// ---------- holding value helpers ----------

function holdingValue(h: Holding): number {
  return (h.shareAmount * (h.currentShareValue ?? 0)) / (h.fxRate ?? 1);
}

function fmtEur(n: number): string {
  return `€ ${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number | null): string {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

// ---------- force simulation ----------

const GW = 740;
const GH = 680;

function useGraphLayout(tags: TagGroup[]) {
  return useMemo(() => {
    if (tags.length === 0) return { nodes: [] as GraphNode[], linked: [] as GraphEdge[] };

    const tickerSet = new Set<string>();
    tags.forEach(tg => tg.tickers.forEach(tk => tickerSet.add(tk)));
    const tickers = [...tickerSet];

    const nodes: GraphNode[] = [];

    tags.forEach((tg, i) => {
      const a = (i / tags.length) * Math.PI * 2 - Math.PI / 2;
      nodes.push({
        id: 'tag:' + tg.name, type: 'tag', label: tg.name, color: tg.color,
        x: GW / 2 + Math.cos(a) * 220, y: GH / 2 + Math.sin(a) * 180,
        vx: 0, vy: 0, r: 14 + Math.sqrt(tg.tickers.length) * 5,
      });
    });

    tickers.forEach((tk, i) => {
      const a = (i / tickers.length) * Math.PI * 2 + 0.7;
      const rad = 60 + ((i * 37) % 60);
      const tagsHere = tags.filter(tg => tg.tickers.includes(tk));
      nodes.push({
        id: 'tk:' + tk, type: 'ticker', label: tk,
        color: tagsHere[0]?.color ?? '#94A3B8',
        x: GW / 2 + Math.cos(a) * rad, y: GH / 2 + Math.sin(a) * rad,
        vx: 0, vy: 0, r: 6 + tagsHere.length * 2,
      });
    });

    const rawEdges = tags.flatMap(tg =>
      tg.tickers.map(tk => ({ from: 'tag:' + tg.name, to: 'tk:' + tk, color: tg.color }))
    );
    const byId = (id: string) => nodes.find(n => n.id === id)!;
    const linked: GraphEdge[] = rawEdges.map(e => ({ ...e, a: byId(e.from), b: byId(e.to) }));

    for (let it = 0; it < 450; it++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const na = nodes[i], nb = nodes[j];
          let dx = nb.x - na.x, dy = nb.y - na.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.5) { d2 = 0.5; dx = 0.7; dy = 0.7; }
          const d = Math.sqrt(d2);
          const strength = (na.type === 'tag' && nb.type === 'tag') ? 3000 : 1400;
          const f = strength / d2;
          na.vx -= (dx / d) * f; na.vy -= (dy / d) * f;
          nb.vx += (dx / d) * f; nb.vy += (dy / d) * f;
        }
      }
      linked.forEach(e => {
        const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
        const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const f = (d - 90) * 0.05;
        e.a.vx += (dx / d) * f; e.a.vy += (dy / d) * f;
        e.b.vx -= (dx / d) * f; e.b.vy -= (dy / d) * f;
      });
      nodes.forEach(n => {
        n.vx += (GW / 2 - n.x) * 0.012; n.vy += (GH / 2 - n.y) * 0.012;
        n.vx *= 0.55; n.vy *= 0.55;
        n.x += n.vx; n.y += n.vy;
      });
    }

    nodes.forEach(n => {
      n.x = Math.max(40, Math.min(GW - 40, n.x));
      n.y = Math.max(40, Math.min(GH - 40, n.y));
    });

    return { nodes, linked };
  }, [tags]);
}

// ---------- SVG graph ----------

interface ViewTransform { x: number; y: number; s: number; }

function MindMapGraph({ tags, nodes, linked, selected, hovered, dark, onSelect, onHover }: {
  tags: TagGroup[];
  nodes: GraphNode[];
  linked: GraphEdge[];
  selected: string | null;
  hovered: string | null;
  dark: boolean;
  onSelect: (name: string | null) => void;
  onHover: (name: string | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const vtRef = useRef<ViewTransform>({ x: 0, y: 0, s: 1 });
  const [vt, setVtState] = useState<ViewTransform>({ x: 0, y: 0, s: 1 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  function setVt(next: ViewTransform) {
    vtRef.current = next;
    setVtState(next);
  }

  function svgCoords(clientX: number, clientY: number) {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (GW / rect.width),
      y: (clientY - rect.top) * (GH / rect.height),
    };
  }

  // Attach non-passive wheel handler so preventDefault works
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const c = svgCoords(e.clientX, e.clientY);
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const prev = vtRef.current;
      const ns = Math.max(0.15, Math.min(6, prev.s * factor));
      const r = ns / prev.s;
      setVt({ s: ns, x: c.x - (c.x - prev.x) * r, y: c.y - (c.y - prev.y) * r });
    };
    svg.addEventListener('wheel', handler, { passive: false });
    return () => svg.removeEventListener('wheel', handler);
  }, []);

  function onBgMouseDown(e: React.MouseEvent) {
    setDragging(true);
    lastPos.current = svgCoords(e.clientX, e.clientY);
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const curr = svgCoords(e.clientX, e.clientY);
    const prev = vtRef.current;
    setVt({ ...prev, x: prev.x + curr.x - lastPos.current.x, y: prev.y + curr.y - lastPos.current.y });
    lastPos.current = curr;
  }

  function onMouseUp() { setDragging(false); }

  function zoomBtn(factor: number) {
    const prev = vtRef.current;
    const ns = Math.max(0.15, Math.min(6, prev.s * factor));
    const r = ns / prev.s;
    const cx = GW / 2, cy = GH / 2;
    setVt({ s: ns, x: cx - (cx - prev.x) * r, y: cy - (cy - prev.y) * r });
  }

  const focus = hovered ?? selected;

  const isNodeActive = useCallback((n: GraphNode) => {
    if (!focus) return true;
    if (n.type === 'tag' && n.label === focus) return true;
    if (n.type === 'ticker') return tags.find(x => x.name === focus)?.tickers.includes(n.label) ?? false;
    return false;
  }, [focus, tags]);

  const isEdgeActive = useCallback((e: GraphEdge) =>
    !focus || e.from === 'tag:' + focus, [focus]);

  const totalTickers = new Set(tags.flatMap(t => t.tickers)).size;
  const border = dark ? '#334155' : '#E2E8F0';
  const textMuted = dark ? '#94A3B8' : '#475569';
  const text = dark ? '#F1F5F9' : '#0F172A';
  const surfaceBg = dark ? 'rgba(15,23,42,0.80)' : 'rgba(255,255,255,0.90)';

  return (
    <div style={{
      position: 'relative', width: '100%',
      background: dark
        ? 'radial-gradient(circle at 50% 45%, #0F172A 0%, #020617 80%)'
        : 'radial-gradient(circle at 50% 45%, #FFFFFF 0%, #F1F5F9 80%)',
      borderRadius: 8, border: `1px solid ${border}`, overflow: 'hidden',
    }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${GW} ${GH}`}
        width="100%"
        style={{ display: 'block', aspectRatio: `${GW} / ${GH}`, cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none' }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <defs>
          <pattern id="grid-dot" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill={dark ? '#1E293B' : '#E2E8F0'} />
          </pattern>
        </defs>

        {/* background: handles pan mousedown, stays static */}
        <rect width={GW} height={GH} fill="url(#grid-dot)" onMouseDown={onBgMouseDown} />

        {/* all graph content inside pan+zoom transform */}
        <g transform={`translate(${vt.x}, ${vt.y}) scale(${vt.s})`}>
          {/* edges */}
          <g>
            {linked.map((e, i) => (
              <line key={i}
                x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y}
                stroke={isEdgeActive(e) ? e.color : (dark ? '#1E293B' : '#E2E8F0')}
                strokeWidth={isEdgeActive(e) ? 1.4 / vt.s : 0.6 / vt.s}
                opacity={isEdgeActive(e) ? 0.55 : (focus ? 0.15 : 0.35)}
              />
            ))}
          </g>

          {/* nodes */}
          <g>
            {nodes.map(n => {
              const active = isNodeActive(n);
              const isTag = n.type === 'tag';
              const isSel = isTag && n.label === selected;
              return (
                <g key={n.id}
                  style={{ cursor: isTag ? 'pointer' : 'default' }}
                  onClick={isTag ? () => onSelect(n.label === selected ? null : n.label) : undefined}
                  onMouseDown={isTag ? (e) => e.stopPropagation() : undefined}
                  onMouseEnter={isTag ? () => onHover(n.label) : undefined}
                  onMouseLeave={isTag ? () => onHover(null) : undefined}
                  opacity={active ? 1 : 0.22}
                >
                  {isSel && <circle cx={n.x} cy={n.y} r={n.r + 10} fill={n.color} opacity="0.18" />}
                  <circle
                    cx={n.x} cy={n.y} r={n.r}
                    fill={isTag ? n.color : (dark ? '#1E293B' : '#FFFFFF')}
                    stroke={isTag ? (isSel ? '#fff' : n.color) : n.color}
                    strokeWidth={isTag ? (isSel ? 2.5 / vt.s : 0) : 2 / vt.s}
                  />
                  <text
                    x={n.x} y={isTag ? n.y + n.r + 14 : n.y + n.r + 12}
                    textAnchor="middle"
                    fontFamily="Inter, system-ui, sans-serif"
                    fontWeight={isTag ? 600 : 500}
                    fontSize={isTag ? (n.r > 24 ? 13 : 12) : 10.5}
                    fill={active ? text : (dark ? '#64748B' : '#94A3B8')}
                    style={{ pointerEvents: 'none' }}
                  >
                    {isTag ? '#' + n.label : n.label}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* legend — top left */}
      <div style={{
        position: 'absolute', left: 14, top: 14,
        display: 'flex', flexDirection: 'column', gap: 6,
        background: surfaceBg, backdropFilter: 'blur(6px)',
        border: `1px solid ${border}`, borderRadius: 6,
        padding: '10px 12px', fontSize: 11, color: textMuted,
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: text, marginBottom: 2 }}>
          <Network size={12} /> Graph view
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: '#4F46E5', display: 'inline-block' }} />
          tag node
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, border: `2px solid ${textMuted}`, background: dark ? '#1E293B' : '#fff', display: 'inline-block' }} />
          ticker
        </div>
      </div>

      {/* zoom controls — top right */}
      <div style={{
        position: 'absolute', right: 14, top: 14,
        display: 'flex', flexDirection: 'column',
        background: dark ? '#1E293B' : '#FFFFFF',
        border: `1px solid ${border}`, borderRadius: 6, overflow: 'hidden',
      }}>
        {([
          { label: '+', title: 'Zoom in',  action: () => zoomBtn(1.25) },
          { label: '−', title: 'Zoom out', action: () => zoomBtn(0.8) },
          { label: '⊙', title: 'Reset',    action: () => setVt({ x: 0, y: 0, s: 1 }) },
        ] as const).map((btn, i) => (
          <button key={btn.label} title={btn.title} onClick={btn.action} style={{
            width: 30, height: 30, border: 'none', background: 'transparent',
            color: textMuted, cursor: 'pointer', fontSize: 14, fontWeight: 600,
            borderBottom: i < 2 ? `1px solid ${border}` : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {btn.label}
          </button>
        ))}
      </div>

      {/* status strip — bottom left */}
      <div style={{
        position: 'absolute', left: 14, bottom: 14,
        fontSize: 11, color: textMuted,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        background: surfaceBg, padding: '5px 10px', borderRadius: 6, border: `1px solid ${border}`,
        pointerEvents: 'none',
      }}>
        {tags.length} tags · {totalTickers} tickers
        {selected ? ` · #${selected} highlighted` : ''}
        {' · '}{Math.round(vt.s * 100)}%
      </div>
    </div>
  );
}

// ---------- tag rail ----------

function TagRail({ tags, selected, filter, setFilter, onSelect, onHover, dark }: {
  tags: TagGroup[];
  selected: string | null;
  filter: string;
  setFilter: (v: string) => void;
  onSelect: (name: string | null) => void;
  onHover: (name: string | null) => void;
  dark: boolean;
}) {
  const filtered = filter
    ? tags.filter(tg => tg.name.includes(filter.toLowerCase()))
    : tags;
  const totalTickers = new Set(tags.flatMap(tg => tg.tickers)).size;
  const border = dark ? '#334155' : '#E2E8F0';
  const text = dark ? '#F1F5F9' : '#0F172A';
  const textMuted = dark ? '#94A3B8' : '#475569';
  const surface = dark ? '#1E293B' : '#FFFFFF';
  const badgeBg = dark ? 'rgba(255,255,255,0.05)' : '#F1F5F9';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: surface, border: `1px solid ${border}`,
      borderRadius: 8, boxShadow: '0 1px 2px rgba(15,23,42,0.04)', overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Hash size={14} color={text} />
          <span style={{ fontSize: 13, fontWeight: 600, color: text }}>Tags</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: textMuted }}>
            {tags.length}
          </span>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: textMuted, pointerEvents: 'none' }} />
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter tags…"
            style={{
              width: '100%', boxSizing: 'border-box',
              paddingLeft: 28, paddingRight: 8, paddingTop: 6, paddingBottom: 6,
              fontSize: 12, borderRadius: 6, border: `1px solid ${border}`,
              background: dark ? '#0F172A' : '#F8FAFC', color: text, outline: 'none',
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 8px 12px' }}>
        <div
          onClick={() => onSelect(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            borderRadius: 6, cursor: 'pointer', marginBottom: 4,
            background: !selected ? (dark ? 'rgba(79,70,229,0.18)' : '#EEF2FF') : 'transparent',
            color: !selected ? '#4F46E5' : textMuted,
          }}
        >
          <Globe size={14} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>All tags</span>
          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace', background: badgeBg, padding: '1px 7px', borderRadius: 999, fontWeight: 600, color: textMuted }}>
            {totalTickers}
          </span>
        </div>

        {filtered.map(tg => {
          const active = selected === tg.name;
          return (
            <div key={tg.name}
              onClick={() => onSelect(active ? null : tg.name)}
              onMouseEnter={() => onHover(tg.name)}
              onMouseLeave={() => onHover(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 6, cursor: 'pointer', margin: '1px 0',
                background: active ? (dark ? 'rgba(255,255,255,0.04)' : '#F8FAFC') : 'transparent',
                borderLeft: `3px solid ${active ? tg.color : 'transparent'}`,
                paddingLeft: active ? 7 : 10,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, background: tg.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? text : textMuted }}>
                  #{tg.name}
                </div>
              </div>
              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: textMuted, background: badgeBg, padding: '1px 7px', borderRadius: 999, fontWeight: 600 }}>
                {tg.tickers.length}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '10px 12px', borderTop: `1px solid ${border}` }}>
        <button style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 6, border: `1px solid ${border}`,
          background: 'transparent', color: textMuted, fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>
          <Plus size={13} /> New tag
        </button>
      </div>
    </div>
  );
}

// ---------- tickers panel ----------

function TickersPanel({ tags, selected, holdingMap, totalPortfolioValue, dark }: {
  tags: TagGroup[];
  selected: string | null;
  holdingMap: Map<string, Holding>;
  totalPortfolioValue: number;
  dark: boolean;
}) {
  const tg = selected ? tags.find(x => x.name === selected) ?? null : null;
  const tickers = tg ? tg.tickers : [...new Set(tags.flatMap(x => x.tickers))];

  const tagValue = useMemo(() =>
    tickers.reduce((sum, tk) => {
      const h = holdingMap.get(tk);
      return sum + (h ? holdingValue(h) : 0);
    }, 0), [tickers, holdingMap]);

  const shareOfPortfolio = totalPortfolioValue > 0
    ? ((tagValue / totalPortfolioValue) * 100).toFixed(1)
    : '—';

  const border = dark ? '#334155' : '#E2E8F0';
  const text = dark ? '#F1F5F9' : '#0F172A';
  const textMuted = dark ? '#94A3B8' : '#475569';
  const textSubtle = dark ? '#64748B' : '#94A3B8';
  const surface = dark ? '#1E293B' : '#FFFFFF';
  const badgeBg = dark ? 'rgba(255,255,255,0.05)' : '#F1F5F9';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: surface, border: `1px solid ${border}`,
      borderRadius: 8, boxShadow: '0 1px 2px rgba(15,23,42,0.04)', overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          {tg
            ? <span style={{ width: 10, height: 10, borderRadius: 999, background: tg.color, flexShrink: 0 }} />
            : <Network size={14} color={text} />
          }
          <span style={{ fontSize: 13, fontWeight: 600, color: text }}>
            {tg ? `#${tg.name}` : 'All tickers'}
          </span>
          <span style={{
            marginLeft: 'auto', fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            color: textMuted, background: badgeBg, padding: '2px 7px', borderRadius: 999, fontWeight: 600,
          }}>{tickers.length}</span>
        </div>
        <div style={{ fontSize: 11, color: textMuted, marginBottom: 10 }}>
          {tg ? `${tickers.length} ticker${tickers.length !== 1 ? 's' : ''} tagged` : 'Across every tag'}
        </div>

        {/* value + share stats */}
        <div style={{ display: 'flex', gap: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: textSubtle, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Value</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: text, fontFeatureSettings: '"tnum"', marginTop: 2 }}>
              {fmtEur(tagValue)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: textSubtle, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Share of portfolio</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: text, fontFeatureSettings: '"tnum"', marginTop: 2 }}>
              {shareOfPortfolio}%
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {tickers.map(tk => {
          const h = holdingMap.get(tk);
          const val = h ? holdingValue(h) : null;
          const plPct = h?.totalProfitPercentage ?? null;
          const isCrypto = h?.assetType === 'CRYPTO';
          return (
            <div key={tk} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderBottom: `1px solid ${border}`, cursor: 'pointer',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 999, flexShrink: 0,
                background: isCrypto ? '#F59E0B' : '#4F46E5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
              }}>
                {tk[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: text, fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>{tk}</div>
                <div style={{ fontSize: 10.5, color: textMuted }}>{h?.assetType ?? '—'}</div>
              </div>
              {val != null && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: text, fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
                    {fmtEur(val)}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 600,
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    color: (plPct ?? 0) >= 0 ? '#10B981' : '#EF4444',
                  }}>
                    {fmtPct(plPct)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- page ----------

export default function TagMapPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const { data: tagData = [], isLoading: tagsLoading } = useAllTags();
  const { data: holdings = [], isLoading: holdingsLoading } = useHoldings(portfolioId!);
  const dark = useIsDark();
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const tags = useMemo(() => buildTagGroups(tagData), [tagData]);
  const { nodes, linked } = useGraphLayout(tags);

  const holdingMap = useMemo(() => {
    const map = new Map<string, Holding>();
    holdings.forEach(h => map.set(h.ticker, h));
    return map;
  }, [holdings]);

  const totalPortfolioValue = useMemo(() =>
    holdings.reduce((sum, h) => sum + holdingValue(h), 0), [holdings]);

  // KPI stats
  const uniqueTaggedTickers = useMemo(() => new Set(tags.flatMap(t => t.tickers)), [tags]);
  const totalConnections = useMemo(() => tags.reduce((s, t) => s + t.tickers.length, 0), [tags]);
  const avgTagsPerTicker = uniqueTaggedTickers.size > 0
    ? (totalConnections / uniqueTaggedTickers.size).toFixed(1)
    : '0';
  const untaggedCount = holdings.filter(h => !uniqueTaggedTickers.has(h.ticker)).length;
  const taggedLabel = holdings.length > 0
    ? `${uniqueTaggedTickers.size} / ${holdings.length}`
    : String(uniqueTaggedTickers.size);

  const isLoading = tagsLoading || holdingsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading tag map…</p>
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Hash className="h-10 w-10 text-slate-300 dark:text-slate-600" />
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
          No tags yet — open any holding's detail dialog to add tags.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 min-h-0">
      {/* page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-slate-900 dark:text-slate-100">Tag Mind Map</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            Visualise tickers grouped by your custom #tags · {tags.length} tags · {uniqueTaggedTickers.size} tickers
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Hash}         label="Custom tags"      value={String(tags.length)}          accent="#4F46E5" />
        <StatCard icon={Network}      label="Tagged tickers"   value={taggedLabel}                   sub={`${Math.round((uniqueTaggedTickers.size / Math.max(holdings.length, 1)) * 100)}% coverage`} accent="#14B8A6" />
        <StatCard icon={Link}         label="Tag connections"  value={String(totalConnections)}      sub={`avg ${avgTagsPerTicker} tags/ticker`} accent="#8B5CF6" />
        <StatCard icon={AlertCircle}  label="Untagged"         value={String(untaggedCount)}         sub={untaggedCount > 0 ? 'needs attention' : 'full coverage'} accent="#F59E0B" />
      </div>

      {/* 3-column workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: 16, height: 720 }}>
        {/* left rail */}
        <TagRail
          tags={tags} selected={selected} filter={filter}
          setFilter={setFilter} onSelect={setSelected} onHover={setHovered} dark={dark}
        />

        {/* center graph card */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          background: dark ? '#1E293B' : '#FFFFFF',
          border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`,
          borderRadius: 8, boxShadow: '0 1px 2px rgba(15,23,42,0.04)', overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: `1px solid ${dark ? '#334155' : '#E2E8F0'}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Network size={14} color={dark ? '#F1F5F9' : '#0F172A'} />
            <span style={{ fontSize: 13, fontWeight: 600, color: dark ? '#F1F5F9' : '#0F172A' }}>Connections</span>
            {selected && (
              <span style={{
                fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                color: tagColor(selected),
                background: dark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                padding: '2px 8px', borderRadius: 999, fontWeight: 600,
              }}>#{selected}</span>
            )}
            {selected && (
              <button onClick={() => setSelected(null)} style={{
                marginLeft: 'auto', fontSize: 11, color: dark ? '#94A3B8' : '#475569',
                background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline',
              }}>Clear</button>
            )}
          </div>
          <div style={{ flex: 1, padding: 12 }}>
            <MindMapGraph
              tags={tags} nodes={nodes} linked={linked}
              selected={selected} hovered={hovered} dark={dark}
              onSelect={setSelected} onHover={setHovered}
            />
          </div>
        </div>

        {/* right tickers panel */}
        <TickersPanel
          tags={tags} selected={selected}
          holdingMap={holdingMap} totalPortfolioValue={totalPortfolioValue}
          dark={dark}
        />
      </div>
    </div>
  );
}
