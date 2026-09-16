'use client';

import type { Member } from '@/lib/crew/types';
import { initials, normalizeUrl } from '@/lib/crew/util';

type Props = {
    member: Pick<Member, 'first' | 'last' | 'avatar'>;
    size?: number;
    active?: boolean;
    className?: string;
};

/** Letter avatar. Falls back to initials in the serif when no avatar URL is set. */
export default function Monogram({ member, size = 36, active = false, className = '' }: Props) {
    const src = normalizeUrl(member.avatar);
    if (src) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={src}
                alt=''
                width={size}
                height={size}
                className={`shrink-0 rounded-full object-cover border border-[var(--ink)] ${className}`}
                style={{ width: size, height: size }}
            />
        );
    }
    return (
        <span
            aria-hidden
            className={`crew-serif shrink-0 inline-flex items-center justify-center rounded-full border border-[var(--ink)] select-none leading-none ${
                active ? 'bg-[var(--ink)] text-[var(--paper)]' : 'bg-[var(--paper)] text-[var(--ink)]'
            } ${className}`}
            style={{ width: size, height: size, fontSize: Math.round(size * 0.44) }}
        >
            {initials(member) || '?'}
        </span>
    );
}
