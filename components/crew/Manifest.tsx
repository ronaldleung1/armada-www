'use client';

import { useMemo, useState } from 'react';
import type { Hit } from '@/lib/crew/search';
import type { Member } from '@/lib/crew/types';
import { birthdayLabel, classLabel, daysUntilBirthday, fullName, placeShort, shortYear, standing } from '@/lib/crew/util';
import Monogram from './Monogram';
import { useCrew } from './context';

type SortKey = 'year' | 'name' | 'joined' | 'updated';
const SORTS: { key: SortKey; label: string }[] = [
    { key: 'year', label: 'Year' },
    { key: 'name', label: 'Name' },
    { key: 'joined', label: 'Joined' },
    { key: 'updated', label: 'Updated' },
];

/** Seniors first, then younger classes, then people who left, then unknown. */
function yearRank(m: Member): number {
    if (m.status === 'Dropped out') return 9000 + (m.gradYear ?? 0);
    return m.gradYear ?? (m.degree ? 9500 : 9999);
}

function compare(sort: SortKey): (a: Hit, b: Hit) => number {
    const byName = (a: Hit, b: Hit) => fullName(a.member).localeCompare(fullName(b.member));
    switch (sort) {
        case 'name':
            return byName;
        case 'joined':
            return (a, b) => (a.member.joined ?? '9999').localeCompare(b.member.joined ?? '9999') || byName(a, b);
        case 'updated':
            return (a, b) => b.member.updatedAt.localeCompare(a.member.updatedAt) || byName(a, b);
        default:
            return (a, b) => yearRank(a.member) - yearRank(b.member) || byName(a, b);
    }
}

export default function Manifest({ hits, searching }: { hits: Hit[]; searching: boolean }) {
    const { members } = useCrew();
    const [sort, setSort] = useState<SortKey>('year');

    const groups = useMemo(() => {
        if (searching) return [{ label: '', rows: hits }];
        const rows = [...hits].sort(compare(sort));
        if (sort !== 'year') return [{ label: '', rows }];
        const out: { label: string; rows: Hit[] }[] = [];
        for (const hit of rows) {
            const label = classLabel(hit.member);
            const last = out[out.length - 1];
            if (last && last.label === label) last.rows.push(hit);
            else out.push({ label, rows: [hit] });
        }
        return out;
    }, [hits, searching, sort]);

    let index = 0;

    return (
        <section>
            <div className='flex flex-wrap items-center justify-between gap-3 py-3 crew-label border-b crew-rule'>
                <span>{searching ? `${hits.length} of ${members.length} match` : `${members.length} aboard`}</span>
                {!searching && (
                    <div className='flex items-center gap-4'>
                        <span>Sort</span>
                        {SORTS.map((s) => (
                            <button
                                key={s.key}
                                onClick={() => setSort(s.key)}
                                aria-pressed={sort === s.key}
                                className={`crew-label transition-colors ${sort === s.key ? 'text-[var(--ink)] underline underline-offset-4' : 'hover:text-[var(--ink)]'}`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className='hidden md:grid grid-cols-[2.25rem_minmax(0,1.5fr)_5.5rem_minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1.1fr)] gap-x-4 py-2 crew-label border-b crew-rule'>
                <span />
                <span>Name</span>
                <span>Year</span>
                <span>Studying</span>
                <span>Building</span>
                <span>Home → now</span>
            </div>

            {hits.length === 0 && (
                <p className='crew-serif italic text-2xl crew-muted py-16 text-center'>
                    Nobody matches that. Try fewer words, or a synonym.
                </p>
            )}

            {groups.map((g) => (
                <div key={g.label || 'all'}>
                    {g.label && (
                        <h2 className='crew-serif text-2xl pt-8 pb-2 flex items-baseline gap-3'>
                            {g.label}
                            <span className='crew-label'>{g.rows.length}</span>
                        </h2>
                    )}
                    <ol>
                        {g.rows.map((hit) => (
                            <Row key={hit.member.id} hit={hit} index={index++} searching={searching} />
                        ))}
                    </ol>
                </div>
            ))}
        </section>
    );
}

function Row({ hit, index, searching }: { hit: Hit; index: number; searching: boolean }) {
    const { now, select, selectedId } = useCrew();
    const m = hit.member;
    const selected = selectedId === m.id;
    const st = standing(m, now);
    const building = [...m.ventures, ...m.projects].map((v) => v.name);
    const from = placeShort(m.hometown);
    const at = placeShort(m.location);
    const bday = daysUntilBirthday(m.birthday, now);

    return (
        <li
            className='crew-row crew-rise'
            style={{ animationDelay: `${Math.min(index, 24) * 22}ms` }}
            data-selected={selected}
            onClick={() => select(selected ? null : m.id)}
        >
            <div className='grid grid-cols-[2.25rem_minmax(0,1fr)] md:grid-cols-[2.25rem_minmax(0,1.5fr)_5.5rem_minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1.1fr)] gap-x-4 gap-y-1 items-center py-3'>
                <Monogram member={m} size={36} active={selected} />
                <div className='min-w-0'>
                    <div className='flex items-baseline gap-2 min-w-0'>
                        <span className='crew-serif text-[19px] leading-tight truncate'>{fullName(m) || 'Unnamed'}</span>
                        {m.nickname && <span className='crew-muted text-sm truncate'>&ldquo;{m.nickname}&rdquo;</span>}
                        {m.role && m.role !== 'Member' && <span className='crew-chip hidden sm:inline-block'>{m.role}</span>}
                        {bday !== null && bday <= 7 && (
                            <span title={bday === 0 ? 'Birthday today!' : `Birthday ${birthdayLabel(m.birthday)}`} aria-label='Birthday soon'>
                                🎂
                            </span>
                        )}
                    </div>
                    {searching && hit.why.length > 0 && (
                        <div className='flex flex-wrap gap-1 mt-1.5'>
                            {hit.why.slice(0, 3).map((w) => (
                                <span key={w} className='crew-chip crew-chip-why'>
                                    {w}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className='hidden md:block text-sm whitespace-nowrap'>
                    {st ? (
                        <>
                            {st} <span className='crew-muted'>{shortYear(m.gradYear)}</span>
                        </>
                    ) : m.gradYear ? (
                        shortYear(m.gradYear)
                    ) : (
                        <span className='crew-muted'>—</span>
                    )}
                </div>
                <div className='hidden md:block text-sm min-w-0 truncate'>
                    {m.majors.length ? m.majors.join(' · ') : <span className='crew-muted'>—</span>}
                    {m.minors.length > 0 && <span className='crew-muted'> + {m.minors.join(', ')}</span>}
                </div>
                <div className='hidden md:block text-sm min-w-0 truncate'>
                    {building.length ? building.join(' · ') : <span className='crew-muted'>—</span>}
                </div>
                <div className='hidden md:flex text-sm min-w-0 items-center gap-1.5'>
                    {from || at ? (
                        <>
                            <span className='truncate'>{from || '?'}</span>
                            {at && (
                                <>
                                    <span className='crew-muted'>→</span>
                                    <span className='truncate'>{at}</span>
                                </>
                            )}
                        </>
                    ) : (
                        <span className='crew-muted'>—</span>
                    )}
                </div>

                <div className='md:hidden col-start-2 text-sm crew-muted truncate'>
                    {[st ? `${st} ${shortYear(m.gradYear)}` : shortYear(m.gradYear), m.majors.join(' · '), building.slice(0, 2).join(' · '), from]
                        .filter(Boolean)
                        .join(' · ') || 'Nothing filled in yet'}
                </div>
            </div>
        </li>
    );
}
