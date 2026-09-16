/** A link to something a member built or works on. */
export type Venture = {
    name: string;
    url?: string;
};

/** A place with optional coordinates (lat/lng in degrees). */
export type Place = {
    name: string;
    lat?: number;
    lng?: number;
};

export type MemberStatus =
    | 'Active'
    | 'Alumni'
    | 'On leave'
    | 'Dropped out'
    | 'Inactive';

export const MEMBER_STATUSES: MemberStatus[] = [
    'Active',
    'Alumni',
    'On leave',
    'Dropped out',
    'Inactive',
];

/**
 * One person on the manifest.
 *
 * Contact details live here too. The vault is encrypted and only served through
 * the worker, but the passphrase is shared club-wide, so treat the contents as
 * "members-only", not "secret".
 */
export type Member = {
    id: string;
    first: string;
    last: string;
    /** Slack title / what people actually call them. */
    nickname?: string;
    role?: string;
    status: MemberStatus;
    /** Expected graduation year, or the year they left if status is "Dropped out". */
    gradYear?: number;
    /** "Masters", "PhD", "MEng" for non-undergrads. */
    degree?: string;
    majors: string[];
    minors: string[];
    /** Businesses, startups, jobs. */
    ventures: Venture[];
    /** Side projects. */
    projects: Venture[];
    interests: string[];
    hometown?: Place;
    /** Where they are right now. */
    location?: Place;
    linkedin?: string;
    website?: string;
    x?: string;
    github?: string;
    email?: string;
    phone?: string;
    /** "YYYY-MM-DD". */
    birthday?: string;
    /** Member id when known, otherwise a free-text name. */
    invitedBy?: string;
    /** "YYYY-MM" of first meeting. */
    joined?: string;
    avatar?: string;
    bio?: string;
    updatedAt: string;
    updatedBy: string;
};

export type LogEntry = {
    at: string;
    by: string;
    memberId: string;
    memberName: string;
    action: 'add' | 'edit' | 'remove';
    fields: string[];
};

/** Plaintext contents of the vault. */
export type Payload = {
    members: Member[];
    log: LogEntry[];
    updatedAt: string;
};

/** Encrypted file format, see lib/crew/vault.mjs. */
export type VaultFile = {
    v: 1;
    keys: { iv: string; k: string }[];
    iv: string;
    ct: string;
};

export type SyncSource = 'api' | 'static' | 'none';

export function emptyMember(id: string, by: string): Member {
    return {
        id,
        first: '',
        last: '',
        status: 'Active',
        majors: [],
        minors: [],
        ventures: [],
        projects: [],
        interests: [],
        updatedAt: new Date().toISOString(),
        updatedBy: by,
    };
}
