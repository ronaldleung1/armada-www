'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { select as d3select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import type { Hit } from '@/lib/crew/search';
import type { Member, Place } from '@/lib/crew/types';
import { fullName, hasCoords, initials, placeShort } from '@/lib/crew/util';
import { useCrew } from './context';

type PinKind = 'home' | 'now';
type Coords = Place & { lat: number; lng: number };
type Pin = { member: Member; kind: PinKind; place: Coords; x: number; y: number };
type Cluster = { key: string; x: number; y: number; pins: Pin[] };

const WORLD_URL = '/world-110m.json';

export default function Chart({ hits, searching }: { hits: Hit[]; searching: boolean }) {
    const { members, select, selectedId } = useCrew();
    const [layers, setLayers] = useState({ home: true, now: true, voyages: true });
    const [size, setSize] = useState({ w: 960, h: 505 });
    const [world, setWorld] = useState<Topology | null>(null);
    const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
    const [hover, setHover] = useState<Cluster | null>(null);

    const wrapRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const animRef = useRef<number | null>(null);

    useEffect(() => {
        let alive = true;
        fetch(WORLD_URL)
            .then((r) => r.json())
            .then((t: Topology) => alive && setWorld(t))
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, []);

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
            .scaleExtent([1, 14])
            .translateExtent([
                [0, 0],
                [size.w, size.h],
            ])
            .on('zoom', (ev) => setTransform(ev.transform));
        d3select(svg).call(z);
        zoomRef.current = z;
        return () => {
            d3select(svg).on('.zoom', null);
        };
    }, [size]);

    const projection = useMemo(
        () =>
            geoNaturalEarth1().fitExtent(
                [
                    [6, 6],
                    [size.w - 6, size.h - 6],
                ],
                { type: 'Sphere' },
            ),
        [size],
    );
    const path = useMemo(() => geoPath(projection), [projection]);

    const shapes = useMemo(() => {
        if (!world) return null;
        const countries = world.objects.countries as GeometryCollection;
        return {
            sphere: path({ type: 'Sphere' }) ?? '',
            graticule: path(geoGraticule10()) ?? '',
            land: path(feature(world, countries)) ?? '',
            borders: path(mesh(world, countries, (a, b) => a !== b)) ?? '',
        };
    }, [world, path]);

    const hitIds = useMemo(() => new Set(hits.map((h) => h.member.id)), [hits]);
    const inScope = (m: Member) => !searching || hitIds.has(m.id);

    const pins = useMemo<Pin[]>(() => {
        const out: Pin[] = [];
        for (const m of members) {
            if (!inScope(m)) continue;
            for (const kind of ['home', 'now'] as PinKind[]) {
                const place = kind === 'home' ? m.hometown : m.location;
                if (!layers[kind] || !hasCoords(place)) continue;
                const p = projection([place.lng, place.lat]);
                if (!p) continue;
                out.push({ member: m, kind, place, x: p[0], y: p[1] });
            }
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [members, layers, projection, searching, hitIds]);

    const voyages = useMemo(() => {
        if (!layers.voyages) return [];
        return members
            .filter((m) => inScope(m) && hasCoords(m.hometown) && hasCoords(m.location))
            .map((m) => ({
                id: m.id,
                d:
                    path({
                        type: 'LineString',
                        coordinates: [
                            [m.hometown!.lng!, m.hometown!.lat!],
                            [m.location!.lng!, m.location!.lat!],
                        ],
                    }) ?? '',
            }))
            .filter((v) => v.d);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [members, layers.voyages, path, searching, hitIds]);

    const clusters = useMemo<Cluster[]>(() => {
        const cell = 30 / transform.k;
        const map = new Map<string, Cluster>();
        for (const p of pins) {
            const key = `${Math.round(p.x / cell)}:${Math.round(p.y / cell)}`;
            const c = map.get(key);
            if (c) c.pins.push(p);
            else map.set(key, { key, x: 0, y: 0, pins: [p] });
        }
        for (const c of map.values()) {
            c.x = c.pins.reduce((s, p) => s + p.x, 0) / c.pins.length;
            c.y = c.pins.reduce((s, p) => s + p.y, 0) / c.pins.length;
        }
        return [...map.values()];
    }, [pins, transform.k]);

    const counts = useMemo(
        () => ({
            home: members.filter((m) => hasCoords(m.hometown)).length,
            now: members.filter((m) => hasCoords(m.location)).length,
            voyages: members.filter((m) => hasCoords(m.hometown) && hasCoords(m.location)).length,
        }),
        [members],
    );
    const unpinned = useMemo(() => members.filter((m) => !hasCoords(m.hometown) && !hasCoords(m.location)), [members]);

    function animateTo(target: ZoomTransform) {
        const svg = svgRef.current;
        const z = zoomRef.current;
        if (!svg || !z) return;
        if (animRef.current) cancelAnimationFrame(animRef.current);
        const from = transform;
        const t0 = performance.now();
        const dur = 420;
        const step = (t: number) => {
            const u = Math.min(1, (t - t0) / dur);
            const e = 1 - Math.pow(1 - u, 3);
            const k = from.k + (target.k - from.k) * e;
            const x = from.x + (target.x - from.x) * e;
            const y = from.y + (target.y - from.y) * e;
            z.transform(d3select(svg), zoomIdentity.translate(x, y).scale(k));
            if (u < 1) animRef.current = requestAnimationFrame(step);
        };
        animRef.current = requestAnimationFrame(step);
    }

    function zoomInto(c: Cluster) {
        const k = Math.min(14, transform.k * 2.8);
        animateTo(zoomIdentity.translate(size.w / 2 - c.x * k, size.h / 2 - c.y * k).scale(k));
    }

    const hoverPos = hover ? transform.apply([hover.x, hover.y]) : null;

    return (
        <section className='flex flex-col gap-3'>
            <div className='flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2 border-b crew-rule text-sm'>
                <div className='flex flex-wrap gap-5'>
                    <Toggle on={layers.home} onChange={(v) => setLayers((l) => ({ ...l, home: v }))}>
                        <Swatch color='var(--ink)' /> Home ports <span className='crew-muted'>{counts.home}</span>
                    </Toggle>
                    <Toggle on={layers.now} onChange={(v) => setLayers((l) => ({ ...l, now: v }))}>
                        <Swatch color='var(--carnelian)' /> Current ports <span className='crew-muted'>{counts.now}</span>
                    </Toggle>
                    <Toggle on={layers.voyages} onChange={(v) => setLayers((l) => ({ ...l, voyages: v }))}>
                        <span className='inline-block w-4 border-t border-dashed border-[var(--carnelian)] align-middle' /> Voyages{' '}
                        <span className='crew-muted'>{counts.voyages}</span>
                    </Toggle>
                </div>
                <div className='flex items-center gap-4 crew-muted'>
                    <span className='hidden sm:inline'>Scroll to zoom, click a cluster to open it.</span>
                    {transform.k > 1.01 && (
                        <button className='underline underline-offset-4 text-[var(--ink)]' onClick={() => animateTo(zoomIdentity)}>
                            Reset view
                        </button>
                    )}
                </div>
            </div>

            <div ref={wrapRef} className='relative w-full aspect-[1.9] min-h-[360px] border crew-rule overflow-hidden bg-[var(--paper)]'>
                <svg ref={svgRef} width={size.w} height={size.h} className='block touch-none select-none'>
                    <g transform={transform.toString()}>
                        {shapes && (
                            <>
                                <path d={shapes.sphere} fill='none' stroke='var(--rule)' vectorEffect='non-scaling-stroke' />
                                <path d={shapes.graticule} fill='none' stroke='var(--rule)' strokeWidth={0.5} vectorEffect='non-scaling-stroke' />
                                <path d={shapes.land} fill='rgba(26,25,24,0.065)' />
                                <path d={shapes.borders} fill='none' stroke='rgba(26,25,24,0.32)' strokeWidth={0.6} vectorEffect='non-scaling-stroke' />
                            </>
                        )}
                        {voyages.map((v) => (
                            <path
                                key={v.id}
                                d={v.d}
                                className='crew-arc'
                                fill='none'
                                stroke='var(--carnelian)'
                                strokeWidth={1.2}
                                strokeOpacity={0.85}
                                vectorEffect='non-scaling-stroke'
                            />
                        ))}
                        {clusters.map((c) => {
                            const single = c.pins.length === 1;
                            const p = c.pins[0];
                            const kinds = new Set(c.pins.map((x) => x.kind));
                            const color = kinds.size === 1 && kinds.has('now') ? 'var(--carnelian)' : 'var(--ink)';
                            const sel = c.pins.some((x) => x.member.id === selectedId);
                            const r = single ? 11 : Math.min(22, 11 + Math.sqrt(c.pins.length) * 2.6);
                            return (
                                <g
                                    key={c.key}
                                    className='crew-pin'
                                    transform={`translate(${c.x},${c.y}) scale(${1 / transform.k})`}
                                    onMouseEnter={() => setHover(c)}
                                    onMouseLeave={() => setHover(null)}
                                    onClick={() => (single ? select(p.member.id) : zoomInto(c))}
                                >
                                    <circle r={r + 6} fill='transparent' />
                                    <circle r={r} fill={sel ? color : 'var(--paper)'} stroke={color} strokeWidth={1.25} />
                                    <text textAnchor='middle' dy='0.35em' fontSize={single ? 10.5 : 12} className='crew-serif' fill={sel ? 'var(--paper)' : color}>
                                        {single ? initials(p.member) : c.pins.length}
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                </svg>

                {hover && hoverPos && (
                    <div
                        className='absolute pointer-events-none bg-[var(--paper)] border border-[var(--ink)] px-3 py-2 text-sm max-w-[260px]'
                        style={{
                            left: Math.min(size.w - 270, Math.max(8, hoverPos[0] + 14)),
                            top: Math.min(size.h - 40, Math.max(8, hoverPos[1] - 10)),
                        }}
                    >
                        <p className='crew-label mb-1'>{placeShort(hover.pins[0].place) || 'Somewhere'}</p>
                        {hover.pins.slice(0, 8).map((p) => (
                            <p key={`${p.member.id}-${p.kind}`} className='truncate'>
                                {fullName(p.member)}{' '}
                                <span className='crew-muted text-xs'>{p.kind === 'home' ? 'from here' : 'here now'}</span>
                            </p>
                        ))}
                        {hover.pins.length > 8 && <p className='crew-muted text-xs'>and {hover.pins.length - 8} more</p>}
                    </div>
                )}

                {!world && <div className='absolute inset-0 grid place-items-center crew-muted text-sm'>Unrolling the chart…</div>}
                {world && pins.length === 0 && (
                    <div className='absolute inset-0 grid place-items-center pointer-events-none'>
                        <p className='crew-serif italic text-2xl crew-muted text-center max-w-sm px-6'>
                            {searching ? 'None of these people have a pin yet.' : 'No pins yet. Add your hometown to appear here.'}
                        </p>
                    </div>
                )}
            </div>

            {unpinned.length > 0 && !searching && (
                <p className='text-sm crew-muted leading-relaxed'>
                    Not on the chart yet:{' '}
                    {unpinned.map((m, i) => (
                        <span key={m.id}>
                            <button className='underline underline-offset-4 hover:text-[var(--ink)]' onClick={() => select(m.id)}>
                                {fullName(m) || 'Unnamed'}
                            </button>
                            {i < unpinned.length - 1 ? ', ' : '.'}
                        </span>
                    ))}
                </p>
            )}
        </section>
    );
}

function Toggle({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
    return (
        <label className={`flex items-center gap-1.5 cursor-pointer select-none transition-opacity ${on ? '' : 'opacity-40'}`}>
            <input type='checkbox' className='sr-only' checked={on} onChange={(e) => onChange(e.target.checked)} />
            {children}
        </label>
    );
}

function Swatch({ color }: { color: string }) {
    return <span className='inline-block w-2.5 h-2.5 rounded-full border' style={{ borderColor: color, background: 'var(--paper)' }} />;
}
