'use client';

import { useMemo, useState } from 'react';
import { MEMBER_STATUSES, type Company, type Member, type MemberStatus, type Place, type Venture } from '@/lib/crew/types';
import { geocode, placeNeedsLookup } from '@/lib/crew/geo';
import { resolveInviter } from '@/lib/crew/edges';
import { linkIndex, linkKey } from '@/lib/crew/links';
import { birthdayLabel, daysUntilBirthday, formatPhone, fullName, hasCoords, hostOf, joinedLabel, normalizeUrl, prettyUrl, relTime, shortYear, splitList, standing, xHandle } from '@/lib/crew/util';
import Monogram from './Monogram';
import { useCrew } from './context';

type Props = {
    member: Member;
    mode: 'view' | 'edit';
    isNew?: boolean;
    busy?: boolean;
    onClose: () => void;
    onEdit: () => void;
    onCancel: () => void;
    onSave: (next: Member) => Promise<void>;
    onRemove: () => Promise<void>;
};

export default function Profile(props: Props) {
    return (
        <aside className='crew-drawer fixed inset-y-0 right-0 z-30 w-full sm:w-[480px] bg-[var(--paper)] overflow-y-auto' aria-label='Profile'>
            <div className='p-6 sm:p-8 flex flex-col gap-6 min-h-full'>
                {props.mode === 'view' ? <View {...props} /> : <Editor key={props.member.id} {...props} />}
            </div>
        </aside>
    );
}

/* ------------------------------------------------------------------ view */

function View({ member: m, onClose, onEdit }: Props) {
    const { members, now, select } = useCrew();
    const inviter = resolveInviter(members, m.invitedBy);
    const invited = members.filter((x) => x.invitedBy && resolveInviter(members, x.invitedBy)?.id === m.id);
    const shared = useMemo(() => linkIndex(members), [members]);
    const st = standing(m, now);
    const meta = [m.role && m.role !== 'Member' ? m.role : null, st ? `${st} ${shortYear(m.gradYear)}`.trim() : null, m.status !== 'Active' ? m.status : null]
        .filter(Boolean)
        .join(' · ');
    const links = [
        m.linkedin && { label: 'LinkedIn', href: normalizeUrl(m.linkedin)! },
        m.website && { label: hostOf(m.website), href: normalizeUrl(m.website)! },
        m.x && { label: xHandle(m.x), href: normalizeUrl(m.x)! },
        m.github && { label: 'GitHub', href: normalizeUrl(m.github)! },
    ].filter(Boolean) as { label: string; href: string }[];
    const bday = daysUntilBirthday(m.birthday, now);

    return (
        <>
            <div className='flex items-center justify-between'>
                <button onClick={onClose} className='crew-label hover:text-[var(--ink)]'>
                    ← Close
                </button>
                <button onClick={onEdit} className='crew-btn'>
                    Edit
                </button>
            </div>

            <div className='flex items-start gap-5 crew-rise'>
                <Monogram member={m} size={64} />
                <div className='min-w-0'>
                    <h2 className='crew-serif text-4xl leading-none break-words'>{fullName(m) || 'Unnamed'}</h2>
                    {m.nickname && <p className='crew-serif italic crew-muted text-xl mt-1'>&ldquo;{m.nickname}&rdquo;</p>}
                    {meta && <p className='text-sm mt-2'>{meta}</p>}
                    {m.company && (
                        <p className='text-sm mt-1'>
                            {m.company.role ? `${m.company.role} at ` : 'At '}
                            {normalizeUrl(m.company.url) ? (
                                <a href={normalizeUrl(m.company.url)} target='_blank' rel='noopener noreferrer' className='underline underline-offset-4'>
                                    {m.company.name}
                                </a>
                            ) : (
                                m.company.name
                            )}
                        </p>
                    )}
                </div>
            </div>

            {m.bio && <p className='text-[15px] leading-relaxed crew-rise'>{m.bio}</p>}

            <dl className='flex flex-col gap-4 border-t crew-rule pt-5 crew-rise' style={{ animationDelay: '60ms' }}>
                <Line label='Projects'>{m.projects.length ? <LinkList items={m.projects} shared={shared} /> : <Empty />}</Line>
                <Line label='Studying'>
                    {m.majors.length ? m.majors.join(', ') : <Empty />}
                    {m.minors.length > 0 && <span className='crew-muted'> · minor{m.minors.length > 1 ? 's' : ''} in {m.minors.join(', ')}</span>}
                </Line>
                <Line label='Into'>
                    {m.interests.length ? (
                        <span className='flex flex-wrap gap-1.5'>
                            {m.interests.map((i) => (
                                <span key={i} className='crew-chip'>
                                    {i}
                                </span>
                            ))}
                        </span>
                    ) : (
                        <Empty />
                    )}
                </Line>
                <Line label='From'>
                    {m.hometown?.name || <Empty />}
                    {m.hometown?.name && !hasCoords(m.hometown) && <Unpinned />}
                </Line>
                <Line label='Now in'>
                    {m.location?.name || <Empty what='Nobody knows yet' />}
                    {m.location?.name && !hasCoords(m.location) && <Unpinned />}
                </Line>
                <Line label='Links'>
                    {links.length ? (
                        <span className='flex flex-wrap gap-x-4 gap-y-1'>
                            {links.map((l) => (
                                <a key={l.href} href={l.href} target='_blank' rel='noopener noreferrer' className='underline underline-offset-4'>
                                    {l.label}
                                </a>
                            ))}
                        </span>
                    ) : (
                        <Empty />
                    )}
                </Line>
                <Line label='Reach'>
                    {m.email || m.phone ? (
                        <span className='flex flex-wrap gap-x-4 gap-y-1'>
                            {m.email && (
                                <a href={`mailto:${m.email}`} className='underline underline-offset-4'>
                                    {m.email}
                                </a>
                            )}
                            {m.phone && (
                                <a href={`tel:${m.phone.replace(/[^\d+]/g, '')}`} className='underline underline-offset-4'>
                                    {formatPhone(m.phone)}
                                </a>
                            )}
                        </span>
                    ) : (
                        <Empty />
                    )}
                </Line>
                <Line label='Birthday'>
                    {m.birthday ? (
                        <>
                            {birthdayLabel(m.birthday)}
                            {bday !== null && (
                                <span className='crew-muted'> · {bday === 0 ? 'today 🎂' : bday === 1 ? 'tomorrow' : `in ${bday} days`}</span>
                            )}
                        </>
                    ) : (
                        <Empty />
                    )}
                </Line>
                <Line label='Aboard since'>
                    {joinedLabel(m.joined) || <Empty what='Unknown' />}
                    {(inviter || m.invitedBy) && (
                        <span className='crew-muted'>
                            {' '}
                            · invited by{' '}
                            {inviter ? (
                                <button className='underline underline-offset-4 text-[var(--ink)]' onClick={() => select(inviter.id)}>
                                    {fullName(inviter)}
                                </button>
                            ) : (
                                <span className='text-[var(--ink)]'>{m.invitedBy}</span>
                            )}
                        </span>
                    )}
                </Line>
                {invited.length > 0 && (
                    <Line label='Brought aboard'>
                        <span className='flex flex-wrap gap-x-3 gap-y-1'>
                            {invited.map((x) => (
                                <button key={x.id} className='underline underline-offset-4' onClick={() => select(x.id)}>
                                    {fullName(x)}
                                </button>
                            ))}
                        </span>
                    </Line>
                )}
            </dl>

            <p className='mt-auto pt-6 text-xs crew-muted border-t crew-rule'>
                Last edited by {m.updatedBy} · {relTime(m.updatedAt, now)}. Anyone aboard can edit this.
            </p>
        </>
    );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className='grid grid-cols-[6.5rem_1fr] gap-3 text-[15px] leading-snug'>
            <dt className='crew-label pt-0.5'>{label}</dt>
            <dd className='min-w-0'>{children}</dd>
        </div>
    );
}

function Empty({ what = 'Not filled in' }: { what?: string }) {
    return <span className='crew-muted italic'>{what}</span>;
}

function Unpinned() {
    return <span className='crew-muted text-xs'> · not on the chart yet</span>;
}

function LinkList({ items, shared }: { items: Venture[]; shared: Map<string, string> }) {
    return (
        <span className='flex flex-wrap gap-x-3 gap-y-1'>
            {items.map((v, i) => {
                const href = normalizeUrl(v.url ?? shared.get(linkKey(v.name)));
                return href ? (
                    <a key={`${v.name}-${i}`} href={href} target='_blank' rel='noopener noreferrer' className='underline underline-offset-4'>
                        {v.name}
                    </a>
                ) : (
                    <span key={`${v.name}-${i}`}>{v.name}</span>
                );
            })}
        </span>
    );
}

/* ---------------------------------------------------------------- editor */

function cleanPlace(p?: Place): Place | undefined {
    const name = p?.name?.trim();
    if (!name) return undefined;
    const out: Place = { name };
    if (hasCoords(p)) {
        out.lat = p.lat;
        out.lng = p.lng;
    }
    return out;
}

/** Show URLs without the scheme while editing; normalizeUrl restores it on save. */
function prettifyUrls(m: Member): Member {
    return {
        ...m,
        linkedin: prettyUrl(m.linkedin),
        website: prettyUrl(m.website),
        x: prettyUrl(m.x),
        github: prettyUrl(m.github),
        avatar: prettyUrl(m.avatar),
        company: m.company ? { ...m.company, url: prettyUrl(m.company.url) } : undefined,
        projects: m.projects.map((p) => ({ ...p, url: prettyUrl(p.url) })),
    };
}

function cleanCompany(c?: Company): Company | undefined {
    const name = c?.name?.trim();
    if (!name) return undefined;
    const out: Company = { name };
    const url = normalizeUrl(c?.url);
    if (url) out.url = url;
    const role = c?.role?.trim();
    if (role) out.role = role;
    return out;
}

function cleanVentures(list: Venture[]): Venture[] {
    return list
        .map((v) => ({ name: v.name.trim(), url: normalizeUrl(v.url) }))
        .filter((v) => v.name)
        .map((v) => (v.url ? v : { name: v.name }));
}

function Editor({ member, isNew, busy, onCancel, onSave, onRemove }: Props) {
    const { members, editor, changeEditor } = useCrew();
    const shared = useMemo(() => linkIndex(members), [members]);
    const [d, setD] = useState<Member>(() => prettifyUrls(JSON.parse(JSON.stringify(member)) as Member));
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [locating, setLocating] = useState(false);
    const set = <K extends keyof Member>(k: K, v: Member[K]) => setD((prev) => ({ ...prev, [k]: v }));

    const others = members.filter((m) => m.id !== member.id).sort((a, b) => fullName(a).localeCompare(fullName(b)));
    const [inviterOther, setInviterOther] = useState(!!d.invitedBy && !others.some((o) => o.id === d.invitedBy));

    /** Pin un-pinned places and append the state/country, one Nominatim call each, a second apart. */
    async function completePlaces(): Promise<{ hometown?: Place; location?: Place }> {
        const out = { hometown: cleanPlace(d.hometown), location: cleanPlace(d.location) };
        let calls = 0;
        for (const key of ['hometown', 'location'] as const) {
            const p = out[key];
            if (!p || !placeNeedsLookup(p)) continue;
            if (calls > 0) await new Promise((r) => setTimeout(r, 1100));
            calls++;
            try {
                const hit = await geocode(p.name);
                if (hit) out[key] = { name: p.name.includes(',') ? p.name : hit.name, lat: hasCoords(p) ? p.lat : hit.lat, lng: hasCoords(p) ? p.lng : hit.lng };
            } catch {
                // keep what they typed
            }
        }
        return out;
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!d.first.trim()) return;
        setLocating(true);
        let places: { hometown?: Place; location?: Place };
        try {
            places = await completePlaces();
        } finally {
            setLocating(false);
        }
        const next: Member = {
            ...d,
            first: d.first.trim(),
            last: d.last.trim(),
            nickname: d.nickname?.trim() || undefined,
            role: d.role?.trim() || undefined,
            bio: d.bio?.trim() || undefined,
            gradYear: d.gradYear || undefined,
            degree: d.degree?.trim() || undefined,
            email: d.email?.trim() || undefined,
            phone: d.phone?.trim() || undefined,
            birthday: d.birthday || undefined,
            github: normalizeUrl(d.github),
            linkedin: normalizeUrl(d.linkedin),
            website: normalizeUrl(d.website),
            x: normalizeUrl(d.x),
            avatar: normalizeUrl(d.avatar),
            hometown: places.hometown,
            location: places.location,
            projects: cleanVentures(d.projects),
            company: cleanCompany(d.company),
            majors: d.majors.map((s) => s.trim()).filter(Boolean),
            minors: d.minors.map((s) => s.trim()).filter(Boolean),
            interests: d.interests.map((s) => s.trim()).filter(Boolean),
            invitedBy: d.invitedBy?.trim() || undefined,
            joined: d.joined || undefined,
        };
        await onSave(next);
    }

    return (
        <form onSubmit={submit} className='flex flex-col gap-7'>
            <div className='flex items-center justify-between'>
                <button type='button' onClick={onCancel} className='crew-label hover:text-[var(--ink)]'>
                    ← Cancel
                </button>
                <button type='button' onClick={changeEditor} className='crew-label hover:text-[var(--ink)] hover:underline underline-offset-4' title='Change who signs this edit'>
                    {isNew ? 'New member · ' : ''}editing as {editor ?? 'someone'} · change
                </button>
            </div>
            <h2 className='crew-serif text-3xl leading-tight'>{isNew ? 'Welcome aboard.' : fullName(member)}</h2>

            <Section title='Who'>
                <div className='grid grid-cols-2 gap-4'>
                    <Text label='First name' value={d.first} onChange={(v) => set('first', v)} required autoFocus />
                    <Text label='Last name' value={d.last} onChange={(v) => set('last', v)} />
                </div>
                <Text label='Goes by / Slack title' value={d.nickname ?? ''} onChange={(v) => set('nickname', v)} placeholder='Unc' />
                <div className='grid grid-cols-2 gap-4'>
                    <Text label='Role' value={d.role ?? ''} onChange={(v) => set('role', v)} placeholder='Member' />
                    <Field label='Status'>
                        <select className='crew-input' value={d.status} onChange={(e) => set('status', e.target.value as MemberStatus)}>
                            {MEMBER_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                    <Text
                        label={d.status === 'Dropped out' ? 'Year you left' : 'Grad year'}
                        type='number'
                        value={d.gradYear ? String(d.gradYear) : ''}
                        onChange={(v) => set('gradYear', v ? Number(v) : undefined)}
                        placeholder='2027'
                    />
                    <Text label='Degree, if not undergrad' value={d.degree ?? ''} onChange={(v) => set('degree', v)} placeholder='Masters, PhD, MEng' />
                </div>
                <Text label='Avatar image link' value={d.avatar ?? ''} onChange={(v) => set('avatar', v)} placeholder='blank keeps your initials' />
            </Section>

            <Section title='Reach'>
                <div className='grid grid-cols-2 gap-4'>
                    <Text label='Email' type='email' value={d.email ?? ''} onChange={(v) => set('email', v)} placeholder='netid@cornell.edu' />
                    <Text label='Phone' type='tel' value={d.phone ?? ''} onChange={(v) => set('phone', v)} placeholder='607 555 0100' />
                </div>
                <Text label='Birthday' type='date' value={d.birthday ?? ''} onChange={(v) => set('birthday', v)} />
            </Section>

            <Section title='Studying'>
                <ListText label='Majors' value={d.majors} onChange={(v) => set('majors', v)} placeholder='Computer Science, Linguistics' />
                <ListText label='Minors' value={d.minors} onChange={(v) => set('minors', v)} placeholder='Comma-separated' />
            </Section>

            <Section title='Projects'>
                <Links label='Startups, side projects, anything you build' items={d.projects} onChange={(v) => set('projects', v)} shared={shared} />
            </Section>

            <Section title='Company / role (optional)'>
                <div className='grid grid-cols-2 gap-4'>
                    <Text label='Company' value={d.company?.name ?? ''} onChange={(v) => set('company', { ...(d.company ?? { name: '' }), name: v })} placeholder='Leave blank if none' />
                    <Text label='Role' value={d.company?.role ?? ''} onChange={(v) => set('company', { ...(d.company ?? { name: '' }), role: v })} placeholder='Founder, intern, PhD…' />
                </div>
                <Text label='Company link' value={d.company?.url ?? ''} onChange={(v) => set('company', { ...(d.company ?? { name: '' }), url: v })} placeholder='company.com' />
            </Section>

            <Section title='Into'>
                <ListText label='Interests' value={d.interests} onChange={(v) => set('interests', v)} placeholder='Languages, board games, sailing' />
                <Field label='Bio'>
                    <textarea
                        className='crew-input resize-none leading-relaxed'
                        rows={3}
                        value={d.bio ?? ''}
                        onChange={(e) => set('bio', e.target.value)}
                        placeholder='One or two lines. What should people ping you about?'
                    />
                </Field>
            </Section>

            <Section title='Where'>
                <PlaceField label='Hometown' value={d.hometown} onChange={(v) => set('hometown', v)} placeholder='Prague, Czechia' />
                <PlaceField label='Current location' value={d.location} onChange={(v) => set('location', v)} placeholder='Ithaca, New York, United States' />
            </Section>

            <Section title='Links'>
                <Text label='LinkedIn' value={d.linkedin ?? ''} onChange={(v) => set('linkedin', v)} placeholder='linkedin.com/in/…' />
                <Text label='Personal website' value={d.website ?? ''} onChange={(v) => set('website', v)} placeholder='yourname.com' />
                <Text label='X / Twitter' value={d.x ?? ''} onChange={(v) => set('x', v)} placeholder='x.com/handle' />
                <Text label='GitHub' value={d.github ?? ''} onChange={(v) => set('github', v)} placeholder='github.com/handle' />
            </Section>

            <Section title='Armada'>
                <div className='grid grid-cols-2 gap-4'>
                    <Field label='Invited by'>
                        {inviterOther ? (
                            <>
                                <input className='crew-input' value={d.invitedBy ?? ''} onChange={(e) => set('invitedBy', e.target.value)} placeholder='Their name' />
                                <button
                                    type='button'
                                    className='text-xs underline underline-offset-4 crew-muted self-start mt-1'
                                    onClick={() => {
                                        setInviterOther(false);
                                        set('invitedBy', undefined);
                                    }}
                                >
                                    pick from manifest instead
                                </button>
                            </>
                        ) : (
                            <select
                                className='crew-input'
                                value={d.invitedBy ?? ''}
                                onChange={(e) => {
                                    if (e.target.value === '__other__') {
                                        setInviterOther(true);
                                        set('invitedBy', '');
                                    } else set('invitedBy', e.target.value || undefined);
                                }}
                            >
                                <option value=''>—</option>
                                {others.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {fullName(o)}
                                    </option>
                                ))}
                                <option value='__other__'>Someone not on the manifest…</option>
                            </select>
                        )}
                    </Field>
                    <Text label='First meeting' type='month' value={d.joined ?? ''} onChange={(v) => set('joined', v)} />
                </div>
            </Section>

            <div className='sticky bottom-0 -mx-6 sm:-mx-8 px-6 sm:px-8 py-4 bg-[var(--paper)] border-t crew-rule flex items-center gap-3 mt-2'>
                <button type='submit' className='crew-btn' disabled={busy || locating || !d.first.trim()}>
                    {locating ? 'Pinning places…' : busy ? 'Saving…' : isNew ? 'Add to manifest' : 'Save'}
                </button>
                <button type='button' onClick={onCancel} className='crew-btn crew-btn-ghost'>
                    Cancel
                </button>
                {!isNew &&
                    (confirmRemove ? (
                        <span className='ml-auto text-sm flex gap-2 items-center'>
                            Remove {member.first}?
                            <button type='button' className='crew-btn crew-btn-red' onClick={onRemove} disabled={busy}>
                                Yes
                            </button>
                            <button type='button' className='underline underline-offset-4' onClick={() => setConfirmRemove(false)}>
                                No
                            </button>
                        </span>
                    ) : (
                        <button type='button' className='ml-auto text-sm crew-muted hover:text-[var(--carnelian)]' onClick={() => setConfirmRemove(true)}>
                            Remove from manifest
                        </button>
                    ))}
            </div>
        </form>
    );
}

/* --------------------------------------------------------- form primitives */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <fieldset className='flex flex-col gap-4 border-t crew-rule pt-4'>
            <legend className='crew-label pr-3'>{title}</legend>
            {children}
        </fieldset>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className='flex flex-col gap-1 min-w-0'>
            <span className='crew-label'>{label}</span>
            {children}
        </label>
    );
}

function Text({
    label,
    value,
    onChange,
    placeholder,
    type = 'text',
    required,
    autoFocus,
    list,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
    autoFocus?: boolean;
    list?: string;
}) {
    return (
        <Field label={label}>
            <input
                className='crew-input'
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                autoFocus={autoFocus}
                list={list}
                autoComplete='off'
            />
        </Field>
    );
}

/** Comma-separated list. Keeps the raw string so commas don't vanish mid-typing. */
function ListText({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
    const [raw, setRaw] = useState(value.join(', '));
    return (
        <Field label={label}>
            <input
                className='crew-input'
                value={raw}
                placeholder={placeholder}
                onChange={(e) => {
                    setRaw(e.target.value);
                    onChange(splitList(e.target.value));
                }}
            />
        </Field>
    );
}

function Links({ label, items, onChange, shared }: { label: string; items: Venture[]; onChange: (v: Venture[]) => void; shared: Map<string, string> }) {
    const rows = items.length ? items : [{ name: '' }];
    const update = (i: number, patch: Partial<Venture>) => {
        const next = rows.map((r, j) => (j === i ? { ...r, ...patch } : r));
        onChange(next);
    };
    return (
        <div className='flex flex-col gap-2'>
            <span className='crew-label'>{label}</span>
            {rows.map((r, i) => (
                <div key={i} className='grid grid-cols-[1fr_1fr_auto] gap-3 items-end'>
                    <input className='crew-input' value={r.name} onChange={(e) => update(i, { name: e.target.value })} placeholder='Name' />
                    <input
                        className='crew-input'
                        value={r.url ?? ''}
                        onChange={(e) => update(i, { url: e.target.value })}
                        placeholder={shared.get(linkKey(r.name)) ? `shared: ${hostOf(shared.get(linkKey(r.name)))}` : 'Link (optional)'}
                    />
                    <button
                        type='button'
                        className='crew-muted hover:text-[var(--carnelian)] pb-1.5 text-lg leading-none'
                        aria-label='Remove row'
                        onClick={() => onChange(rows.filter((_, j) => j !== i))}
                    >
                        ×
                    </button>
                </div>
            ))}
            <button type='button' className='self-start text-sm underline underline-offset-4' onClick={() => onChange([...rows, { name: '' }])}>
                + add another
            </button>
        </div>
    );
}

function PlaceField({ label, value, onChange, placeholder }: { label: string; value?: Place; onChange: (v: Place | undefined) => void; placeholder?: string }) {
    const [state, setState] = useState<'idle' | 'finding' | 'found' | 'missed'>('idle');
    const pinned = hasCoords(value);

    async function find() {
        if (!value?.name?.trim()) return;
        setState('finding');
        try {
            const hit = await geocode(value.name);
            if (hit) {
                onChange({ name: value.name.includes(',') ? value.name : hit.name, lat: hit.lat, lng: hit.lng });
                setState('found');
            } else setState('missed');
        } catch {
            setState('missed');
        }
    }

    return (
        <div className='flex flex-col gap-1'>
            <span className='crew-label'>{label}</span>
            <div className='grid grid-cols-[1fr_auto] gap-3 items-end'>
                <input
                    className='crew-input'
                    value={value?.name ?? ''}
                    placeholder={placeholder}
                    onChange={(e) => {
                        setState('idle');
                        onChange(e.target.value ? { name: e.target.value } : undefined);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            void find();
                        }
                    }}
                />
                <button type='button' className='crew-btn crew-btn-ghost' onClick={find} disabled={!value?.name?.trim() || state === 'finding'}>
                    {state === 'finding' ? 'Finding…' : pinned ? 'Re-pin' : 'Pin on chart'}
                </button>
            </div>
            <span className='text-xs crew-muted min-h-[1rem]'>
                {state === 'missed' && 'Could not find that. Try "City, Country".'}
                {state === 'found' && `Pinned as ${value?.name ?? ''}.`}
                {state === 'idle' && pinned && `Pinned at ${value!.lat!.toFixed(2)}, ${value!.lng!.toFixed(2)}`}
                {state === 'idle' && !pinned && value?.name && 'Pinned automatically when you save.'}
            </span>
        </div>
    );
}
