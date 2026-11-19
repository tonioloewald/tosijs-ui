/** Item and list ids: they become file names, so nothing else gets through. */
export declare const CHECKLIST_ID: RegExp;
/** A request body over this (gzipped, as sent) is refused. */
export declare const MAX_ANSWER_BYTES: number;
/** A body that inflates past this is refused: the cap on what gzip may claim. */
export declare const MAX_INFLATED_BYTES: number;
export interface ChecklistItem {
    id: string;
    text: string;
    /** a page to open: a site path (`/button/`) or an http(s) URL */
    url?: string;
    steps?: string[];
}
export interface ChecklistSection {
    title?: string;
    items: ChecklistItem[];
}
export interface Checklist {
    id: string;
    title: string;
    postedAt: string;
    sections: ChecklistSection[];
}
export type ChecklistVerdict = 'pass' | 'fail' | null;
export interface ChecklistAnswer {
    verdict: ChecklistVerdict;
    comment: string;
    at: string;
    /** the page the answer was given on */
    page?: string;
    /** the schematic's file, relative to the store */
    schematic?: string;
}
export interface ChecklistAnswers {
    listId: string;
    answers: Record<string, ChecklistAnswer>;
}
export interface ChecklistResults {
    list: Checklist | null;
    answers: Record<string, ChecklistAnswer>;
    total: number;
    pass: number;
    fail: number;
    open: number;
}
/** The store's folder: `setting` if given, else a per-project folder in the temp dir. */
export declare function checklistDirFor(root: string, setting?: string, dir?: string): string;
/** A site path or an http(s) URL; anything else (a `javascript:` URL) is refused. */
export declare function safeItemUrl(url: string): boolean;
/**
 * Check a posted list and fill in what may be left out: ids, the posting time, a section for
 * a bare `items` array. Returns the list, or what is wrong with it.
 */
export declare function normalizeChecklist(input: unknown, now?: Date): Checklist | {
    problem: string;
};
/** Post a list. It replaces the current one, and the old answers and schematics go with it. */
export declare function postChecklist(dir: string, list: Checklist): void;
/**
 * Remove the list and everything answered against it: only the files the store writes, so a
 * `--dir` that names a folder with anything else in it loses nothing else. The folder itself
 * goes only if that leaves it empty.
 */
export declare function clearChecklist(dir: string): void;
export declare const readChecklist: (dir: string) => Checklist | null;
/** The list, its answers, and the count of each verdict. */
export declare function checklistResults(dir: string): ChecklistResults;
export type AnswerResult = {
    ok: true;
    answer: ChecklistAnswer;
} | {
    ok: false;
    status: 400 | 404 | 409;
    reason: string;
};
/**
 * Record one item's answer. `schematic` replaces the stored one when given; a comment-only
 * update keeps it.
 */
export declare function saveChecklistAnswer(dir: string, body: unknown, now?: Date): AnswerResult;
/**
 * Read an answer request's body: gzipped JSON when `Content-Encoding: gzip`, plain otherwise.
 * Both caps are checked before parsing, and inflation stops at its cap rather than after it.
 */
export declare function parseAnswerBody(bytes: Uint8Array, gzipped: boolean): Promise<{
    body: unknown;
} | {
    status: 400 | 413;
    reason: string;
}>;
/** `pass` when every item passed, `fail` when any failed, `open` while any is unanswered. */
export declare function checklistVerdict(results: ChecklistResults, failFast?: boolean): 'pass' | 'fail' | 'open';
/** The results as an agent reads them: one line per item, then its comment and schematic. */
export declare function formatChecklistResults(results: ChecklistResults, dir: string): string;
