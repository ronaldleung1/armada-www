'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AnimatedBackButton from '@/components/AnimatedBackButton';
import { STORAGE } from '@/lib/crew/config';
import { search } from '@/lib/crew/search';
import { CrewStore, OfflineError, UnauthorizedError, type SyncState } from '@/lib/crew/store';
import { emptyMember, type LogEntry, type Member, type Payload } from '@/lib/crew/types';
import { changedFields, fullName, relTime, slugify, uniqueId } from '@/lib/crew/util';
import { propagateLinks } from '@/lib/crew/links';
import Chart from './Chart';
import Gate from './Gate';
import Graph from './Graph';
import LogPanel from './LogPanel';
import Manifest from './Manifest';
import Profile from './Profile';
import { CrewContext } from './context';

type View = 'manifest' | 'graph' | 'chart';
type Phase = 'boot' | 'locked' | 'loading' | 'ready' | 'error';

const VIEWS: { id: View; label: string }[] = [
    { id: 'manifest', label: 'Manifest' },
    { id: 'graph', label: 'Graph' },
    { id: 'chart', label: 'Chart' },
];
const NEW_ID = '__new__';
const EXAMPLES = [
    'juniors in CS from California who like ML',
    'hotelies',
    'who is from Jersey',
    'board games',
    'solana',
    'YC founders',
    'real estate',
    'linguistics',
    'anyone into AI safety',
    'cooking',
];

export default function CrewApp() {
    const [store, setStore] = useState<CrewStore | null>(null);
    const [phase, setPhase] = useState<Phase>('boot');
    const [payload, setPayload] = useState<Payload | null>(null);
    const [sync, setSync] = useState<SyncState>({ source: 'none', apiConfigured: false, saving: false, localDraft: false });
    const [view, setView] = useState<View>('manifest');
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [mode, setMode] = useState<'view' | 'edit'>('view');
    const [draftNew, setDraftNew] = useState<Member | null>(null);
    const [editor, setEditor] = useState<string | null>(null);
    const [pending, setPending] = useState<null | (() => void)>(null);
    const [showLog, setShowLog] = useState(false);
    const [busy, setBusy] = useState(false);
    const [exampleIdx, setExampleIdx] = useState(0);
    const now = useMemo(() => new Date(), []);
    const searchRef = useRef<HTMLInputElement>(null);

    const loadAll = useCallback(async (s: CrewStore) => {
        setPhase('loading');
        try {
            const r = await s.load();
            setPayload(r.payload);
            setSync({
                source: r.source,
                apiConfigured: s.apiConfigured,
                saving: false,
                localDraft: s.hasDraft(),
                savedAt: r.payload.updatedAt,
            });
            setPhase('ready');
        } catch (e) {
            if (e instanceof UnauthorizedError) setPhase('locked');
            else {
                setPhase('error');
                setSync((x) => ({ ...x, error: (e as Error).message }));
            }
        }
    }, []);

    useEffect(() => {
        const s = new CrewStore();
        setStore(s);
        setEditor(localStorage.getItem(STORAGE.editor));
        const v = localStorage.getItem(STORAGE.view) as View | null;
        if (v && VIEWS.some((x) => x.id === v)) setView(v);
        s.restore().then((ok) => (ok ? loadAll(s) : setPhase('locked')));
    }, [loadAll]);

    useEffect(() => {
        if (phase === 'ready') localStorage.setItem(STORAGE.view, view);
    }, [view, phase]);

    useEffect(() => {
        if (query) return;
        const t = setInterval(() => setExampleIdx((i) => (i + 1) % EXAMPLES.length), 3800);
        return () => clearInterval(t);
    }, [query]);

    const members = useMemo(() => payload?.members ?? [], [payload]);
    const hits = useMemo(() => search(members, query, now), [members, query, now]);
    const searching = query.trim().length > 0;

    const select = useCallback((id: string | null) => {
        setSelectedId(id);
        setMode('view');
        if (id !== NEW_ID) setDraftNew(null);
    }, []);

    const requireEditor = useCallback(
        (fn: () => void) => {
            if (editor) fn();
            else setPending(() => fn);
        },
        [editor],
    );

    const openEditor = useCallback(
        (id: string) =>
            requireEditor(() => {
                setSelectedId(id);
                setMode('edit');
            }),
        [requireEditor],
    );

    const changeEditor = useCallback(() => setPending(() => () => {}), []);

    const addMember = () =>
        requireEditor(() => {
            setDraftNew(emptyMember(NEW_ID, editor ?? 'someone'));
            setSelectedId(NEW_ID);
            setMode('edit');
        });

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            const typing = !!t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName);
            if (e.key === '/' && !typing) {
                e.preventDefault();
                searchRef.current?.focus();
            } else if (e.key === 'Escape') {
                if (typing && t === searchRef.current) {
                    setQuery('');
                    (t as HTMLInputElement).blur();
                } else if (showLog) setShowLog(false);
                else if (pending) setPending(null);
                else if (mode === 'view' && selectedId) select(null);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [mode, selectedId, select, showLog, pending]);

    const commit = async (list: Member[], entry: LogEntry, message: string) => {
        if (!store || !payload) return;
        const next: Payload = { members: list, log: [entry, ...payload.log].slice(0, 300), updatedAt: new Date().toISOString() };
        setPayload(next);
        setSync((s) => ({ ...s, saving: true, error: undefined }));
        setBusy(true);
        try {
            const saved = await store.save(next, message);
            setPayload(saved);
            setSync({
                source: store.apiConfigured ? 'api' : 'static',
                apiConfigured: store.apiConfigured,
                saving: false,
                savedAt: new Date().toISOString(),
                localDraft: !store.apiConfigured,
            });
        } catch (e) {
            if (e instanceof OfflineError) {
                setSync((s) => ({ ...s, saving: false, localDraft: true, error: 'Offline. Kept in this browser; will sync when the worker is reachable.' }));
            } else if (e instanceof UnauthorizedError) {
                setSync((s) => ({ ...s, saving: false, error: 'The worker rejected this passphrase. Lock and re-enter it.' }));
            } else {
                setSync((s) => ({ ...s, saving: false, error: (e as Error).message }));
            }
        } finally {
            setBusy(false);
        }
    };

    const saveMember = async (next: Member) => {
        const by = editor ?? 'someone';
        const at = new Date().toISOString();
        let list: Member[];
        let entry: LogEntry;
        const isNew = next.id === NEW_ID;
        if (isNew) {
            const id = uniqueId(slugify(fullName(next)), new Set(members.map((m) => m.id)));
            const created: Member = { ...next, id, updatedAt: at, updatedBy: by };
            list = [...members, created];
            entry = { at, by, memberId: id, memberName: fullName(created), action: 'add', fields: [] };
            setDraftNew(null);
            setSelectedId(id);
        } else {
            const prev = members.find((m) => m.id === next.id);
            if (!prev) return;
            const fields = changedFields(prev, next);
            if (fields.length === 0) {
                setMode('view');
                return;
            }
            const updated: Member = { ...next, updatedAt: at, updatedBy: by };
            list = members.map((m) => (m.id === next.id ? updated : m));
            entry = { at, by, memberId: next.id, memberName: fullName(updated), action: 'edit', fields };
        }
        // A link given to a project name flows to everyone else listing that exact
        // name without one. Existing links are never overwritten.
        const linked = propagateLinks(list);
        const others = linked.changed.filter((id) => id !== entry.memberId);
        if (others.length) entry.fields = [...entry.fields, `linked ${others.length} other profile${others.length === 1 ? '' : 's'}`];
        setMode('view');
        await commit(linked.members, entry, `crew: ${by} ${isNew ? 'added' : 'updated'} ${entry.memberName}`);
    };

    const removeMember = async () => {
        const target = members.find((m) => m.id === selectedId);
        if (!target) return;
        const by = editor ?? 'someone';
        const at = new Date().toISOString();
        const entry: LogEntry = { at, by, memberId: target.id, memberName: fullName(target), action: 'remove', fields: [] };
        select(null);
        await commit(
            members.filter((m) => m.id !== target.id),
            entry,
            `crew: ${by} removed ${entry.memberName}`,
        );
    };

    const lock = () => {
        store?.forget();
        setPayload(null);
        setSelectedId(null);
        setPhase('locked');
    };

    const selected = selectedId === NEW_ID ? draftNew : members.find((m) => m.id === selectedId) ?? null;

    if (phase === 'boot') return <div className='crew min-h-screen' />;
    if (phase === 'locked') {
        return (
            <Gate
                onTry={async (pass) => {
                    if (!store) return false;
                    const ok = await store.unlockWith(pass);
                    if (ok) void loadAll(store);
                    return ok;
                }}
            />
        );
    }

    return (
        <CrewContext.Provider value={{ members, now, editor, selectedId, select, openEditor, changeEditor }}>
            <div className='crew min-h-screen'>
                <header className='px-6 sm:px-12 pt-8 max-w-[1440px] mx-auto'>
                    <div className='flex items-center justify-between gap-4'>
                        <AnimatedBackButton />
                        <div className='flex items-center gap-5 text-sm'>
                            <SyncBadge sync={sync} />
                            <button onClick={() => setShowLog(true)} className='hover:underline underline-offset-4'>
                                Log
                            </button>
                            <button onClick={lock} className='hover:underline underline-offset-4'>
                                Lock
                            </button>
                        </div>
                    </div>

                    <div className='flex flex-wrap items-end justify-between gap-x-8 gap-y-4 mt-10'>
                        <div className='crew-rise'>
                            <p className='crew-label'>Cornell Armada · internal</p>
                            <h1 className='crew-serif text-5xl sm:text-7xl leading-[0.95] mt-2'>Crew manifest</h1>
                        </div>
                        <div className='flex items-baseline gap-3 crew-rise' style={{ animationDelay: '80ms' }}>
                            <span className='crew-pixel text-[72px] sm:text-[96px] leading-none text-[var(--carnelian)]'>{members.length}</span>
                            <span className='crew-label'>aboard</span>
                        </div>
                    </div>

                    <div className='mt-8 crew-rise' style={{ animationDelay: '160ms' }}>
                        <div className='relative'>
                            <input
                                ref={searchRef}
                                className='crew-input crew-serif text-2xl sm:text-3xl pr-14'
                                placeholder={`Try “${EXAMPLES[exampleIdx]}”`}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoComplete='off'
                                spellCheck={false}
                                aria-label='Search the manifest'
                            />
                            {query && (
                                <button
                                    className='absolute right-0 top-1/2 -translate-y-1/2 crew-label hover:text-[var(--ink)]'
                                    onClick={() => {
                                        setQuery('');
                                        searchRef.current?.focus();
                                    }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        <p className='mt-2 text-xs crew-muted'>
                            {searching
                                ? `${hits.length} match${hits.length === 1 ? '' : 'es'} · fuzzy and synonym-aware, all in your browser`
                                : 'Search names, majors, projects, interests, places. Press / to focus.'}
                        </p>
                    </div>

                    <nav className='mt-6 flex items-center justify-between border-b crew-rule gap-4 crew-rise' style={{ animationDelay: '240ms' }}>
                        <div className='flex gap-6 text-sm' role='tablist' aria-label='View'>
                            {VIEWS.map((v) => (
                                <button key={v.id} role='tab' aria-selected={view === v.id} className='crew-tab' onClick={() => setView(v.id)}>
                                    {v.label}
                                </button>
                            ))}
                        </div>
                        <button onClick={addMember} className='text-sm hover:underline underline-offset-4 whitespace-nowrap'>
                            + Add member
                        </button>
                    </nav>
                </header>

                <main className={`px-6 sm:px-12 pb-24 max-w-[1440px] mx-auto transition-[padding] duration-300 ${selected ? 'lg:pr-[520px]' : ''}`}>
                    {phase === 'loading' && <p className='py-24 text-center crew-serif italic text-2xl crew-muted crew-rise'>Unrolling the manifest…</p>}
                    {phase === 'error' && (
                        <div className='py-24 text-center'>
                            <p className='crew-serif italic text-2xl'>Could not open the manifest.</p>
                            <p className='crew-muted text-sm mt-2'>{sync.error}</p>
                            <button className='crew-btn mt-6' onClick={() => store && loadAll(store)}>
                                Try again
                            </button>
                        </div>
                    )}
                    {phase === 'ready' && (
                        <div className='mt-2'>
                            {view === 'manifest' && <Manifest hits={hits} searching={searching} />}
                            {view === 'graph' && <Graph hits={hits} searching={searching} />}
                            {view === 'chart' && <Chart hits={hits} searching={searching} />}
                        </div>
                    )}
                </main>

                {selected && (
                    <Profile
                        member={selected}
                        mode={mode}
                        isNew={selectedId === NEW_ID}
                        busy={busy}
                        onClose={() => select(null)}
                        onEdit={() => openEditor(selected.id)}
                        onCancel={() => (selectedId === NEW_ID ? select(null) : setMode('view'))}
                        onSave={saveMember}
                        onRemove={removeMember}
                    />
                )}

                {pending && (
                    <EditorPicker
                        members={members}
                        current={editor}
                        onPick={(name) => {
                            setEditor(name);
                            localStorage.setItem(STORAGE.editor, name);
                            const fn = pending;
                            setPending(null);
                            fn();
                        }}
                        onCancel={() => setPending(null)}
                    />
                )}

                {showLog && payload && <LogPanel log={payload.log} onClose={() => setShowLog(false)} />}
            </div>
        </CrewContext.Provider>
    );
}

function SyncBadge({ sync }: { sync: SyncState }) {
    let text: string;
    let color = 'var(--ink)';
    let title = '';
    if (sync.error) {
        text = sync.error.length > 48 ? 'Sync problem' : sync.error;
        title = sync.error;
        color = 'var(--carnelian)';
    } else if (sync.saving) {
        text = 'Saving…';
    } else if (!sync.apiConfigured) {
        text = 'Local copy · edits stay in this browser';
        title = 'No sync worker configured. See worker/README.md to enable shared edits.';
        color = 'var(--muted)';
    } else if (sync.source === 'static') {
        text = 'Offline copy';
        color = 'var(--muted)';
    } else {
        text = `Synced${sync.savedAt ? ` · ${relTime(sync.savedAt)}` : ''}`;
    }
    return (
        <span className='crew-label hidden sm:flex items-center gap-2' title={title}>
            <span className='inline-block w-1.5 h-1.5 rounded-full' style={{ background: color }} />
            {text}
        </span>
    );
}

function EditorPicker({ members, current, onPick, onCancel }: { members: Member[]; current: string | null; onPick: (name: string) => void; onCancel: () => void }) {
    const [picked, setPicked] = useState(current && members.some((m) => fullName(m) === current) ? current : '');
    const [typed, setTyped] = useState('');
    const chosen = typed.trim() || picked;
    const sorted = [...members].filter((m) => fullName(m)).sort((a, b) => fullName(a).localeCompare(fullName(b)));
    return (
        <div className='fixed inset-0 z-50 crew-scrim grid place-items-center p-6' onClick={onCancel}>
            <form
                className='bg-[var(--paper)] border border-[var(--ink)] p-6 w-full max-w-sm crew-rise flex flex-col gap-4'
                onClick={(e) => e.stopPropagation()}
                onSubmit={(e) => {
                    e.preventDefault();
                    if (chosen) onPick(chosen);
                }}
            >
                <p className='crew-label'>{current ? 'Change who signs your edits' : 'Before you edit'}</p>
                <h2 className='crew-serif text-3xl leading-tight'>Who&rsquo;s holding the pen?</h2>
                <p className='text-sm crew-muted'>Edits are signed, not locked. Anyone aboard can change anything; the log shows who did.</p>
                <select className='crew-input' value={picked} onChange={(e) => setPicked(e.target.value)}>
                    <option value=''>Pick yourself…</option>
                    {sorted.map((m) => (
                        <option key={m.id} value={fullName(m)}>
                            {fullName(m)}
                        </option>
                    ))}
                </select>
                <input className='crew-input' placeholder='…or type your name' value={typed} onChange={(e) => setTyped(e.target.value)} />
                <div className='flex gap-3 pt-1'>
                    <button type='submit' className='crew-btn' disabled={!chosen}>
                        Continue as {chosen || '…'}
                    </button>
                    <button type='button' className='crew-btn crew-btn-ghost' onClick={onCancel}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
