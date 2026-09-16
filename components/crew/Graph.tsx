'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    forceCollide,
    forceLink,
    forceManyBody,
    forceSimulation,
    forceX,
    forceY,
    type SimulationLinkDatum,
    type SimulationNodeDatum,
} from 'd3-force';
import { select as d3select } from 'd3-selection';
import { zoom as d3zoom } from 'd3-zoom';
import { drag as d3drag, type D3DragEvent } from 'd3-drag';
import type { Hit } from '@/lib/crew/search';
import { LENSES, buildGraph, connectedIds, type GNode, type Lens } from '@/lib/crew/edges';
import { fullName, initials, normalizeUrl } from '@/lib/crew/util';
import { useCrew } from './context';

type SimNode = GNode & SimulationNodeDatum & { r: number };
type SimLink = SimulationLinkDatum<SimNode> & { directed?: boolean; weak?: boolean; key: string };

const R_PERSON = 15;

function radiusOf(n: GNode): number {
    if (n.kind === 'person') return R_PERSON;
    if (n.kind === 'ghost') return 12;
    return Math.max(12, Math.min(44, n.label.length * 2.7));
}

const linkKey = (s: string, t: string) => `${s}→${t}`;

export default function Graph({ hits, searching }: { hits: Hit[]; searching: boolean }) {
    const { members, select, selectedId, editor } = useCrew();
    const [lens, setLens] = useState<Lens>('invites');
    const [showLoners, setShowLoners] = useState(true);
    const [hoverId, setHoverId] = useState<string | null>(null);
    const [size, setSize] = useState({ w: 900, h: 600 });

    const wrapRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const gRef = useRef<SVGGElement>(null);
    const nodeEls = useRef(new Map<string, SVGGElement>());
    const linkEls = useRef(new Map<string, SVGLineElement>());
    /** Last known positions by id, so nodes glide between lenses instead of re-exploding. */
    const posRef = useRef(new Map<string, { x: number; y: number }>());

    const graph = useMemo(() => buildGraph(members, lens), [members, lens]);
    const lonerCount = useMemo(() => {
        const conn = connectedIds(graph);
        return graph.nodes.filter((n) => n.kind === 'person' && !conn.has(n.id)).length;
    }, [graph]);
    const visible = useMemo(() => {
        if (showLoners) return graph;
        const conn = connectedIds(graph);
        return { nodes: graph.nodes.filter((n) => n.kind !== 'person' || conn.has(n.id)), links: graph.links };
    }, [graph, showLoners]);

    const visibleIds = useMemo(() => new Set(visible.nodes.map((n) => n.id)), [visible]);
    const neighbors = useMemo(() => {
        const map = new Map<string, Set<string>>();
        const add = (a: string, b: string) => {
            if (!map.has(a)) map.set(a, new Set());
            map.get(a)!.add(b);
        };
        for (const l of visible.links) {
            add(l.source, l.target);
            add(l.target, l.source);
        }
        return map;
    }, [visible]);
    const hitIds = useMemo(() => new Set(hits.map((h) => h.member.id)), [hits]);

    const hovering = !!hoverId && visibleIds.has(hoverId);
    const focusId = hovering ? hoverId : selectedId && visibleIds.has(selectedId) ? selectedId : null;
    /** Hover dims hard; a mere selection only softens the rest. */
    const dimClass = hovering ? 'dim' : 'soft';

    function nodeDim(n: GNode): string {
        if (focusId) return n.id !== focusId && !neighbors.get(focusId)?.has(n.id) ? dimClass : '';
        if (searching) {
            if (n.kind === 'person') return hitIds.has(n.id) ? '' : 'dim';
            const ns = neighbors.get(n.id);
            return !ns || ![...ns].some((id) => hitIds.has(id)) ? 'dim' : '';
        }
        return '';
    }
    function linkDim(source: string, target: string): string {
        if (focusId) return source !== focusId && target !== focusId ? dimClass : '';
        if (searching) return hitIds.has(source) || hitIds.has(target) ? '' : 'dim';
        return '';
    }

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) setSize({ w: width, h: height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const z = d3zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.25, 4])
            .on('zoom', (ev) => gRef.current?.setAttribute('transform', ev.transform.toString()));
        d3select(svg).call(z);
        return () => {
            d3select(svg).on('.zoom', null);
        };
    }, []);

    useEffect(() => {
        const cx = size.w / 2;
        const cy = size.h / 2;
        const nodes: SimNode[] = visible.nodes.map((n) => {
            const p = posRef.current.get(n.id);
            const a = Math.random() * Math.PI * 2;
            const d = 40 + Math.random() * 180;
            return { ...n, r: radiusOf(n), x: p?.x ?? cx + Math.cos(a) * d, y: p?.y ?? cy + Math.sin(a) * d };
        });
        const byId = new Map(nodes.map((n) => [n.id, n]));
        const links: SimLink[] = visible.links
            .filter((l) => byId.has(l.source) && byId.has(l.target))
            .map((l) => ({ source: l.source, target: l.target, directed: l.directed, weak: l.weak, key: linkKey(l.source, l.target) }));

        const sim = forceSimulation<SimNode>(nodes)
            .force(
                'link',
                forceLink<SimNode, SimLink>(links)
                    .id((d) => d.id)
                    .distance((l) => (l.source as SimNode).r + (l.target as SimNode).r + (l.weak ? 54 : 32))
                    .strength((l) => (l.weak ? 0.25 : 0.6)),
            )
            .force('charge', forceManyBody<SimNode>().strength((d) => (d.kind === 'hub' ? -280 : -180)).distanceMax(460))
            .force('collide', forceCollide<SimNode>((d) => d.r + 9).iterations(2))
            .force('x', forceX<SimNode>(cx).strength(0.035))
            .force('y', forceY<SimNode>(cy).strength(0.05))
            .alpha(1)
            .alphaDecay(0.028);

        const tick = () => {
            for (const n of nodes) {
                posRef.current.set(n.id, { x: n.x!, y: n.y! });
                nodeEls.current.get(n.id)?.setAttribute('transform', `translate(${n.x},${n.y})`);
            }
            for (const l of links) {
                const el = linkEls.current.get(l.key);
                if (!el) continue;
                const s = l.source as SimNode;
                const t = l.target as SimNode;
                let x2 = t.x!;
                let y2 = t.y!;
                if (l.directed) {
                    const dx = x2 - s.x!;
                    const dy = y2 - s.y!;
                    const len = Math.hypot(dx, dy) || 1;
                    x2 -= (dx / len) * (t.r + 5);
                    y2 -= (dy / len) * (t.r + 5);
                }
                el.setAttribute('x1', String(s.x));
                el.setAttribute('y1', String(s.y));
                el.setAttribute('x2', String(x2));
                el.setAttribute('y2', String(y2));
            }
        };
        sim.on('tick', tick);
        tick();

        type DragEv = D3DragEvent<SVGGElement, unknown, unknown>;
        const dragBehavior = d3drag<SVGGElement, unknown>()
            .on('start', function (this: SVGGElement) {
                const n = byId.get(this.dataset.id ?? '');
                if (!n) return;
                sim.alphaTarget(0.25).restart();
                n.fx = n.x;
                n.fy = n.y;
            })
            .on('drag', function (this: SVGGElement, ev: DragEv) {
                const n = byId.get(this.dataset.id ?? '');
                if (!n) return;
                n.fx = ev.x;
                n.fy = ev.y;
            })
            .on('end', function (this: SVGGElement) {
                const n = byId.get(this.dataset.id ?? '');
                if (!n) return;
                n.fx = null;
                n.fy = null;
                sim.alphaTarget(0);
            });
        const dragged: SVGGElement[] = [];
        for (const [id, el] of nodeEls.current) {
            if (!byId.has(id)) continue;
            d3select(el).call(dragBehavior);
            dragged.push(el);
        }

        return () => {
            sim.stop();
            for (const el of dragged) d3select(el).on('.drag', null);
        };
    }, [visible, size]);

    const current = LENSES.find((l) => l.id === lens)!;

    return (
        <section className='flex flex-col gap-3'>
            <div className='flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b crew-rule'>
                <div className='flex gap-5 overflow-x-auto text-sm' role='tablist' aria-label='Graph lens'>
                    {LENSES.map((L) => (
                        <button key={L.id} role='tab' aria-selected={lens === L.id} className='crew-tab' onClick={() => setLens(L.id)}>
                            {L.label}
                        </button>
                    ))}
                </div>
                <label className='flex items-center gap-2 text-sm crew-muted cursor-pointer select-none py-2'>
                    <input type='checkbox' checked={showLoners} onChange={(e) => setShowLoners(e.target.checked)} className='accent-[#b31b1b]' />
                    Show the {lonerCount} unconnected
                </label>
            </div>
            <p className='text-sm crew-muted'>
                {current.blurb} Drag to arrange, scroll to zoom, click a person to open them.
            </p>

            <div
                ref={wrapRef}
                className='relative w-full h-[min(72vh,820px)] min-h-[440px] border crew-rule overflow-hidden'
                style={{ background: 'radial-gradient(ellipse at center, transparent 50%, var(--faint) 100%)' }}
            >
                <svg ref={svgRef} width={size.w} height={size.h} className='block touch-none select-none'>
                    <defs>
                        <marker id='crew-arrow' viewBox='0 0 10 10' refX='9' refY='5' markerWidth='7' markerHeight='7' orient='auto-start-reverse'>
                            <path d='M 0 0 L 10 5 L 0 10 z' fill='var(--ink)' />
                        </marker>
                    </defs>
                    <g ref={gRef}>
                        <g>
                            {visible.links.map((l) => {
                                const key = linkKey(l.source, l.target);
                                return (
                                    <line
                                        key={key}
                                        ref={(el) => {
                                            if (el) linkEls.current.set(key, el);
                                            else linkEls.current.delete(key);
                                        }}
                                        className={`crew-link ${linkDim(l.source, l.target)}`}
                                        stroke='var(--ink)'
                                        strokeOpacity={l.weak ? 0.35 : 0.55}
                                        strokeWidth={1}
                                        strokeDasharray={l.weak ? '3 3' : undefined}
                                        markerEnd={l.directed ? 'url(#crew-arrow)' : undefined}
                                    />
                                );
                            })}
                        </g>
                        <g>
                            {visible.nodes.map((n) => {
                                const r = radiusOf(n);
                                const selected = n.id === selectedId;
                                const isYou = !!(n.member && editor && fullName(n.member) === editor);
                                const dim = nodeDim(n);
                                return (
                                    <g
                                        key={n.id}
                                        data-id={n.id}
                                        ref={(el) => {
                                            if (el) nodeEls.current.set(n.id, el);
                                            else nodeEls.current.delete(n.id);
                                        }}
                                        className={`crew-node ${dim}`}
                                        onMouseEnter={() => setHoverId(n.id)}
                                        onMouseLeave={() => setHoverId(null)}
                                        onClick={() => {
                                            if (n.kind === 'person') select(selected ? null : n.id);
                                        }}
                                    >
                                        {n.kind === 'person' && n.member && (
                                            <>
                                                {n.member.avatar ? (
                                                    <>
                                                        <clipPath id={`crew-clip-${n.id}`}>
                                                            <circle r={r} />
                                                        </clipPath>
                                                        <image
                                                            href={normalizeUrl(n.member.avatar)}
                                                            x={-r}
                                                            y={-r}
                                                            width={2 * r}
                                                            height={2 * r}
                                                            clipPath={`url(#crew-clip-${n.id})`}
                                                            preserveAspectRatio='xMidYMid slice'
                                                        />
                                                        <circle r={r} fill='none' stroke={isYou ? 'var(--carnelian)' : 'var(--ink)'} strokeWidth={selected ? 2 : 1} />
                                                    </>
                                                ) : (
                                                    <>
                                                        <circle
                                                            r={r}
                                                            fill={selected ? 'var(--ink)' : 'var(--paper)'}
                                                            stroke={isYou ? 'var(--carnelian)' : 'var(--ink)'}
                                                            strokeWidth={selected || isYou ? 1.75 : 1}
                                                        />
                                                        <text textAnchor='middle' dy='0.35em' fontSize={13} className='crew-serif' fill={selected ? 'var(--paper)' : 'var(--ink)'}>
                                                            {initials(n.member) || '?'}
                                                        </text>
                                                    </>
                                                )}
                                                <text y={r + 13} textAnchor='middle' fontSize={11} fill='var(--muted)'>
                                                    {n.member.first || n.label}
                                                </text>
                                            </>
                                        )}
                                        {n.kind === 'hub' && (
                                            <>
                                                <rect x={-5} y={-5} width={10} height={10} transform='rotate(45)' fill='var(--ink)' />
                                                <text y={20} textAnchor='middle' fontSize={11.5} fontWeight={500} fill='var(--ink)'>
                                                    {n.label}
                                                </text>
                                                {(n.count ?? 0) > 1 && (
                                                    <text y={32} textAnchor='middle' fontSize={10} fill='var(--muted)'>
                                                        {n.count}
                                                    </text>
                                                )}
                                            </>
                                        )}
                                        {n.kind === 'ghost' && (
                                            <>
                                                <circle r={r} fill='var(--paper)' stroke='var(--ink)' strokeDasharray='3 3' />
                                                <text textAnchor='middle' dy='0.35em' fontSize={11} className='crew-serif' fill='var(--muted)'>
                                                    {n.label
                                                        .split(' ')
                                                        .map((w) => w[0] ?? '')
                                                        .join('')
                                                        .slice(0, 2)
                                                        .toUpperCase()}
                                                </text>
                                                <text y={r + 13} textAnchor='middle' fontSize={11} fill='var(--muted)'>
                                                    {n.label}
                                                </text>
                                                <text y={r + 25} textAnchor='middle' fontSize={9} fill='var(--muted)'>
                                                    not on manifest
                                                </text>
                                            </>
                                        )}
                                    </g>
                                );
                            })}
                        </g>
                    </g>
                </svg>
                {visible.links.length === 0 && (
                    <div className='absolute inset-0 grid place-items-center pointer-events-none'>
                        <p className='crew-serif italic text-2xl crew-muted text-center max-w-sm px-6'>
                            Nobody is connected through this lens yet. Fill in your profile and lines will appear.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
