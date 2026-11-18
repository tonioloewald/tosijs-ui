import type { ChecklistSpec, ChecklistItemAnswer } from '../checklist.js';
/** Injected by the dev server into the pages it serves: there is a checklist endpoint to ask. */
export declare const CHECKLIST_ENDPOINT_SNIPPET = "<script>window.__tosiChecklist=true</script>";
export declare const CHECKLIST_ENDPOINT = "/__checklist";
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
