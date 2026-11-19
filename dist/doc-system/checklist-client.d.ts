export interface ChecklistItemSpec {
    id?: string;
    text: string;
    url?: string;
    steps?: string[];
}
export interface ChecklistSpec {
    id?: string;
    title: string;
    items?: (ChecklistItemSpec | string)[];
    sections?: {
        title?: string;
        items: (ChecklistItemSpec | string)[];
    }[];
}
export type ChecklistVerdict = 'pass' | 'fail' | null;
export interface ChecklistItemAnswer {
    verdict: ChecklistVerdict;
    comment: string;
}
export interface ChecklistChange extends ChecklistItemAnswer {
    itemId: string;
    changed: 'verdict' | 'comment';
}
export interface ChecklistItem {
    id: string;
    text: string;
    url?: string;
    steps?: string[];
}
/** The list's sections, with every item given an id the way the dev server's store does. */
export declare function checklistSections(spec: ChecklistSpec | null): {
    title?: string;
    items: ChecklistItem[];
}[];
/** Injected by the dev server into the pages it serves: there is a checklist endpoint to ask. */
export declare const CHECKLIST_ENDPOINT_SNIPPET = "<script>window.__tosiChecklist=true</script>";
export declare const CHECKLIST_ENDPOINT = "/__checklist";
/** Where the page asks: where your server mounted `checklistHandler`. */
export declare function setChecklistEndpoint(path: string): void;
/** Whether the page was served by a dev server with a checklist endpoint. */
export declare const hasChecklistEndpoint: () => boolean;
export interface ChecklistState {
    list: (ChecklistSpec & {
        id: string;
    }) | null;
    answers: Record<string, ChecklistItemAnswer>;
    total: number;
    pass: number;
    fail: number;
    open: number;
}
/** The posted list and its answers, or null when this page may not see it (or there is none). */
export declare function fetchChecklist(fetcher?: typeof fetch): Promise<ChecklistState | null>;
export interface ChecklistAnswerBody {
    listId: string;
    itemId: string;
    verdict: 'pass' | 'fail' | null;
    comment: string;
    page?: string;
    schematic?: string;
}
/** Send one answer, gzipped. Resolves to an error message, or null when it saved. */
export declare function sendChecklistAnswer(body: ChecklistAnswerBody, fetcher?: typeof fetch): Promise<string | null>;
