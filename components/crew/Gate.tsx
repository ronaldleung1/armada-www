'use client';

import { useState } from 'react';
import Image from 'next/image';
import AnimatedBackButton from '@/components/AnimatedBackButton';
import { RateLimitedError } from '@/lib/crew/store';

type Props = { onTry: (pass: string) => Promise<boolean> };

function waitText(e: RateLimitedError): string {
    const min = Math.max(1, Math.round(e.retryAfter / 60));
    const when = min >= 90 ? `about ${Math.round(min / 60)} h` : `${min} min`;
    if (e.reason === 'cooldown') return `Someone is guessing right now, so new unlocks are paused for ${when}. Browsers that unlocked before are unaffected.`;
    return `Too many guesses from this network. Try again in ${when}.`;
}

export default function Gate({ onTry }: Props) {
    const [value, setValue] = useState('');
    const [state, setState] = useState<'idle' | 'checking' | 'wrong' | 'limited' | 'error'>('idle');
    const [tries, setTries] = useState(0);
    const [limit, setLimit] = useState<RateLimitedError | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!value.trim() || state === 'checking') return;
        setState('checking');
        try {
            const ok = await onTry(value);
            if (!ok) {
                setState('wrong');
                setTries((t) => t + 1);
            }
        } catch (e) {
            if (e instanceof RateLimitedError) {
                setLimit(e);
                setState('limited');
            } else setState('error');
        }
    }

    return (
        <div className='crew min-h-screen grid place-items-center p-8 sm:p-20'>
            <form onSubmit={submit} className='w-full max-w-md flex flex-col gap-10'>
                <div className='crew-rise'>
                    <AnimatedBackButton />
                </div>
                <div className='crew-rise' style={{ animationDelay: '80ms' }}>
                    <Image src='/ship.png' alt='' width={150} height={100} priority />
                </div>
                <div className='crew-rise' style={{ animationDelay: '160ms' }}>
                    <p className='crew-label'>Members only</p>
                    <h1 className='crew-serif italic text-[40px] sm:text-5xl leading-[1.05] mt-3'>
                        What is Armada&rsquo;s official beverage?
                    </h1>
                </div>
                <div className={`crew-rise ${state === 'wrong' ? 'crew-shake' : ''}`} style={{ animationDelay: '240ms' }} key={tries}>
                    <input
                        autoFocus
                        autoComplete='off'
                        autoCapitalize='off'
                        spellCheck={false}
                        className='crew-input crew-serif text-3xl'
                        placeholder='…'
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            if (state !== 'idle') setState('idle');
                        }}
                        style={state === 'wrong' ? { borderBottomColor: 'var(--carnelian)' } : undefined}
                    />
                    <div className='flex items-baseline justify-between gap-4 mt-4 text-sm'>
                        <span className='crew-muted'>Hint: there&rsquo;s a custom emoji for it in the Slack.</span>
                        <button type='submit' className='underline underline-offset-4 whitespace-nowrap' disabled={state === 'checking'}>
                            {state === 'checking' ? 'Checking…' : 'Board →'}
                        </button>
                    </div>
                    <p className='mt-3 text-sm min-h-[1.25rem]' style={{ color: 'var(--carnelian)' }} aria-live='polite'>
                        {state === 'wrong' && (tries >= 3 ? 'Still not it. Look for the emoji.' : 'Not it.')}
                        {state === 'limited' && limit && waitText(limit)}
                        {state === 'error' && 'Could not reach the manifest. Check your connection and try again.'}
                    </p>
                </div>
            </form>
        </div>
    );
}
