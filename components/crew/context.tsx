'use client';

import { createContext, useContext } from 'react';
import type { Member } from '@/lib/crew/types';

export type CrewCtx = {
    members: Member[];
    now: Date;
    /** Display name signing edits, if chosen. */
    editor: string | null;
    selectedId: string | null;
    select: (id: string | null) => void;
    openEditor: (id: string) => void;
    /** Re-open the "who's holding the pen?" picker. */
    changeEditor: () => void;
};

export const CrewContext = createContext<CrewCtx | null>(null);

export function useCrew(): CrewCtx {
    const ctx = useContext(CrewContext);
    if (!ctx) throw new Error('useCrew must be used inside CrewApp');
    return ctx;
}
