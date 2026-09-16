import type { Member } from './types';
import { canon, norm } from './search';
import { classLabel, fullName, regionKey } from './util';

export type Lens = 'invites' | 'projects' | 'majors' | 'interests' | 'roots' | 'class';

export const LENSES: { id: Lens; label: string; blurb: string }[] = [
    { id: 'invites', label: 'Who brought whom', blurb: 'The family tree. Arrows point from the person who invited to the person who joined.' },
    { id: 'projects', label: 'Projects', blurb: 'People tied to what they build and where they work. Shared names pull co-builders together.' },
    { id: 'majors', label: 'Majors', blurb: 'Solid lines are majors, dashed are minors.' },
    { id: 'interests', label: 'Interests', blurb: 'Only interests shared by at least two people, after folding synonyms.' },
    { id: 'roots', label: 'Roots', blurb: 'Hometowns grouped by US state or country.' },
    { id: 'class', label: 'Class year', blurb: 'Grouped by expected graduation, or the year someone left.' },
];

export type GNode = {
    id: string;
    kind: 'person' | 'hub' | 'ghost';
    label: string;
    member?: Member;
    count?: number;
};

export type GLink = {
    source: string;
    target: string;
    directed?: boolean;
    weak?: boolean;
};

export type Graph = { nodes: GNode[]; links: GLink[] };

const MAJOR_ALIASES: Record<string, string> = {
    cs: 'Computer Science',
    'comp sci': 'Computer Science',
    compsci: 'Computer Science',
    math: 'Mathematics',
    maths: 'Mathematics',
    'info sci': 'Information Science',
    infosci: 'Information Science',
    'hotel management': 'Hotel Administration',
    hotelie: 'Hotel Administration',
    'data sci': 'Data Science',
    econ: 'Economics',
    'ai': 'AI',
    business: 'Business',
    'applied economics and management': 'Business',
    aem: 'Business',
};

export function canonMajor(s: string): string {
    const n = norm(s);
    return MAJOR_ALIASES[n] ?? s.trim().replace(/\s+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Fold "Wisp AI / Candytrail (YC S25)" and "Candytrail" onto one hub where possible. */
export function projectKey(name: string): string {
    return norm(name)
        .replace(/\(.*?\)/g, ' ')
        .replace(/[^a-z0-9/ ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function titleFor(s: string): string {
    return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function resolveInviter(members: Member[], invitedBy?: string): Member | undefined {
    if (!invitedBy) return undefined;
    const byId = members.find((m) => m.id === invitedBy);
    if (byId) return byId;
    const n = norm(invitedBy);
    return members.find((m) => norm(fullName(m)) === n);
}

export function buildGraph(members: Member[], lens: Lens): Graph {
    const people: GNode[] = members.map((m) => ({ id: m.id, kind: 'person', label: fullName(m), member: m }));
    const links: GLink[] = [];
    const hubs = new Map<string, GNode>();

    const hub = (key: string, label: string): GNode => {
        const id = `hub:${key}`;
        let h = hubs.get(id);
        if (!h) {
            h = { id, kind: 'hub', label, count: 0 };
            hubs.set(id, h);
        }
        h.count = (h.count ?? 0) + 1;
        return h;
    };

    switch (lens) {
        case 'invites': {
            const ghosts = new Map<string, GNode>();
            for (const m of members) {
                if (!m.invitedBy) continue;
                const inviter = resolveInviter(members, m.invitedBy);
                let sourceId: string;
                if (inviter) sourceId = inviter.id;
                else {
                    const gid = `ghost:${norm(m.invitedBy)}`;
                    if (!ghosts.has(gid)) ghosts.set(gid, { id: gid, kind: 'ghost', label: m.invitedBy });
                    sourceId = gid;
                }
                if (sourceId !== m.id) links.push({ source: sourceId, target: m.id, directed: true });
            }
            return { nodes: [...people, ...ghosts.values()], links };
        }
        case 'projects': {
            for (const m of members) {
                const seen = new Set<string>();
                const names = [...m.projects.map((v) => v.name), ...(m.company ? [m.company.name] : [])];
                for (const name of names) {
                    const key = projectKey(name);
                    if (!key || seen.has(key)) continue;
                    seen.add(key);
                    links.push({ source: m.id, target: hub(key, name).id });
                }
            }
            break;
        }
        case 'majors': {
            for (const m of members) {
                const seen = new Set<string>();
                for (const maj of m.majors) {
                    const label = canonMajor(maj);
                    const key = norm(label);
                    if (!key || seen.has(key)) continue;
                    seen.add(key);
                    links.push({ source: m.id, target: hub(key, label).id });
                }
                for (const min of m.minors) {
                    const label = canonMajor(min);
                    const key = norm(label);
                    if (!key || seen.has(key)) continue;
                    seen.add(key);
                    links.push({ source: m.id, target: hub(key, label).id, weak: true });
                }
            }
            break;
        }
        case 'interests': {
            const byKey = new Map<string, { label: string; members: Set<string> }>();
            for (const m of members) {
                for (const raw of m.interests) {
                    const key = canon(raw);
                    if (!key) continue;
                    const entry = byKey.get(key) ?? { label: titleFor(raw), members: new Set() };
                    if (raw.length < entry.label.length) entry.label = titleFor(raw);
                    entry.members.add(m.id);
                    byKey.set(key, entry);
                }
            }
            for (const [key, entry] of byKey) {
                if (entry.members.size < 2) continue;
                const h = hub(key, entry.label);
                h.count = entry.members.size;
                for (const id of entry.members) links.push({ source: id, target: h.id });
            }
            break;
        }
        case 'roots': {
            for (const m of members) {
                const region = regionKey(m.hometown);
                if (!region) continue;
                links.push({ source: m.id, target: hub(norm(region), region).id });
            }
            break;
        }
        case 'class': {
            for (const m of members) {
                const label = classLabel(m);
                if (label === 'Year unknown') continue;
                links.push({ source: m.id, target: hub(norm(label), label).id });
            }
            break;
        }
    }
    return { nodes: [...people, ...hubs.values()], links };
}

export function connectedIds(graph: Graph): Set<string> {
    const s = new Set<string>();
    for (const l of graph.links) {
        s.add(l.source);
        s.add(l.target);
    }
    return s;
}
