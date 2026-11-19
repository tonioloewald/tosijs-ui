/** Whether there is a list to answer (for the settings menu). */
export declare const checklistWaiting: () => boolean;
/** Close the panel; the badge comes back while there is something left to check. */
export declare function closeChecklist(): void;
/** Open the panel, or bring it forward. */
export declare function openChecklist(): Promise<void>;
export interface WatchChecklistOptions {
    /** Where your server mounted `checklistHandler` (default `/__checklist`). */
    endpoint?: string;
}
/**
 * Show a badge while a list is waiting, and the panel to answer it. Call it once, on pages
 * served by a server with the endpoints; only in development, since anyone the server admits
 * sees the list. The doc site calls it for you.
 */
export declare function watchChecklist(options?: WatchChecklistOptions): void;
export { setChecklistEndpoint } from './checklist-client.js';
