'use client';

import { useEffect, useState } from 'react';
import type { Version } from '@/lib/crew/store';
import type { LogEntry } from '@/lib/crew/types';
import { relTime } from '@/lib/crew/util';
import { useCrew } from './context';

type Props = {
    log: LogEntry[];
    onClose: () => void;
    /** Present when a sync worker is configured. */
    loadVersions?: () => Promise<Version[]>;
    onRestore?: (sha: string) => Promise<void>;
};

export default function LogPanel({ log, onClose, loadVersions, onRestore }: Props) {
    const { now, select } = useCrew();
    const [versions, setVersions] = useState<Version[] | null>(null);
    const [confirm, setConfirm] = useState<string | null>(null);
    const [restoring, setRestoring] = useState(false);

    useEffect(() => {
        if (!loadVersions) return;
        let alive = true;
        loadVersions()
            .then((v) => alive && setVersions(v))
            .catch(() => alive && setVersions([]));
        return () => {
            alive = false;
        };
    }, [loadVersions]);
    return (
        <div className='fixed inset-0 z-40 crew-scrim' onClick={onClose}>
            <div
                className='absolute right-4 top-4 sm:right-12 sm:top-16 w-[min(420px,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto bg-[var(--paper)] border border-[var(--ink)] p-5 crew-rise'
                onClick={(e) => e.stopPropagation()}
            >
                <div className='flex items-baseline justify-between mb-4'>
                    <h2 className='crew-serif text-2xl'>Ship&rsquo;s log</h2>
                    <button onClick={onClose} className='crew-label hover:text-[var(--ink)]'>
                        Close
                    </button>
                </div>
                {log.length === 0 ? (
                    <p className='crew-muted text-sm'>No edits yet. Every change anyone makes shows up here, and as a git commit.</p>
                ) : (
                    <ol className='flex flex-col'>
                        {log.slice(0, 60).map((e, i) => (
                            <li key={`${e.at}-${i}`} className='py-2.5 border-b crew-rule text-sm flex flex-col gap-0.5'>
                                <div className='flex items-baseline justify-between gap-3'>
                                    <span>
                                        <span className='font-medium'>{e.by}</span>{' '}
                                        <span className='crew-muted'>
                                            {e.action === 'add' ? 'added' : e.action === 'remove' ? 'removed' : 'edited'}
                                        </span>{' '}
                                        <button
                                            className='underline underline-offset-4'
                                            onClick={() => {
                                                select(e.memberId);
                                                onClose();
                                            }}
                                        >
                                            {e.memberName}
                                        </button>
                                    </span>
                                    <span className='crew-muted whitespace-nowrap text-xs'>{relTime(e.at, now)}</span>
                                </div>
                                {e.fields.length > 0 && <span className='crew-muted text-xs'>{e.fields.join(', ')}</span>}
                            </li>
                        ))}
                    </ol>
                )}

                {loadVersions && (
                    <div className='mt-6 pt-4 border-t crew-rule'>
                        <div className='flex items-baseline justify-between mb-2'>
                            <h3 className='crew-serif text-xl'>Versions</h3>
                            <span className='crew-label'>undo anything</span>
                        </div>
                        {versions === null && <p className='crew-muted text-sm'>Loading…</p>}
                        {versions?.length === 0 && <p className='crew-muted text-sm'>No earlier versions yet. Each save keeps the one before it.</p>}
                        {!!versions?.length && (
                            <ol className='flex flex-col'>
                                {versions.slice(0, 30).map((v) => (
                                    <li key={v.sha} className='py-2 border-b crew-rule text-sm flex items-baseline justify-between gap-3'>
                                        <span className='min-w-0'>
                                            <span className='crew-muted text-xs whitespace-nowrap'>{relTime(v.at, now)}</span>{' '}
                                            <span className='truncate'>{v.message.replace(/^crew: /, '')}</span>
                                        </span>
                                        {confirm === v.sha ? (
                                            <span className='flex items-center gap-2 whitespace-nowrap'>
                                                <button
                                                    className='crew-btn crew-btn-red'
                                                    disabled={restoring}
                                                    onClick={async () => {
                                                        if (!onRestore) return;
                                                        setRestoring(true);
                                                        try {
                                                            await onRestore(v.sha);
                                                            onClose();
                                                        } finally {
                                                            setRestoring(false);
                                                        }
                                                    }}
                                                >
                                                    {restoring ? 'Restoring…' : 'Restore this'}
                                                </button>
                                                <button className='underline underline-offset-4' onClick={() => setConfirm(null)}>
                                                    No
                                                </button>
                                            </span>
                                        ) : (
                                            <button className='crew-label hover:text-[var(--ink)] whitespace-nowrap' onClick={() => setConfirm(v.sha)}>
                                                Go back to this
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
