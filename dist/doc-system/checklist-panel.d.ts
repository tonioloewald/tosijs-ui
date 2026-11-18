/** Whether there is a list to answer (for the settings menu). */
export declare const checklistWaiting: () => boolean;
/** Close the panel; the badge comes back while there is something left to check. */
export declare function closeChecklist(): void;
/** Open the panel, or bring it forward. */
export declare function openChecklist(): Promise<void>;
/** Start watching for a list: once, on a page the dev server served. */
export declare function watchChecklist(): void;
