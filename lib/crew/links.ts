import type { Member, Venture } from './types';
import { norm } from './search';

/** Case/whitespace-insensitive key for matching the same project name across people. */
export function linkKey(name: string): string {
    return norm(name).replace(/[.!?]+$/, '');
}

/** Project/venture name -> first URL anyone has given it. */
export function linkIndex(members: Member[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const m of members) {
        for (const v of [...m.projects, ...(m.company ? [m.company] : [])]) {
            const key = linkKey(v.name);
            if (v.url && key && !map.has(key)) map.set(key, v.url);
        }
    }
    return map;
}

/**
 * Fill in missing URLs from the index. Existing URLs are never overwritten.
 * Returns new member objects only for people whose entries changed.
 */
export function propagateLinks(members: Member[], index: Map<string, string> = linkIndex(members)): { members: Member[]; changed: string[] } {
    const changed: string[] = [];
    const out = members.map((m) => {
        let touched = false;
        const fill = (list: Venture[]) =>
            list.map((v) => {
                if (v.url) return v;
                const url = index.get(linkKey(v.name));
                if (!url) return v;
                touched = true;
                return { ...v, url };
            });
        const projects = fill(m.projects);
        if (!touched) return m;
        changed.push(m.id);
        return { ...m, projects };
    });
    return { members: out, changed };
}
