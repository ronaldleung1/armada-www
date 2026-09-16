'use client';

import type { LogEntry } from '@/lib/crew/types';
import { relTime } from '@/lib/crew/util';
import { useCrew } from './context';

type Props = { log: LogEntry[]; onClose: () => void };

export default function LogPanel({ log, onClose }: Props) {
    const { now, select } = useCrew();
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
                    <p className='crew-muted text-sm'>No edits yet. Every change anyone makes shows up here.</p>
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

            </div>
        </div>
    );
}
