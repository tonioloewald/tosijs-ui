export type HashStateMode = 'hash' | 'memory';
export interface HashStateOptions {
    /**
     * Prefix for every key this instance owns. Two instances with different namespaces can
     * share one URL; two with the same namespace are the same state, deliberately.
     */
    namespace?: string;
    /** `'memory'` keeps the state off the URL entirely — for anything embeddable. */
    mode?: HashStateMode;
}
export interface HashWriteOptions {
    /**
     * Add a history entry instead of replacing the current one. Default `false`: a filter that
     * pushed per keystroke would need thirty back presses to undo one word.
     */
    push?: boolean;
}
export interface HashState {
    /** this namespace's keys, unprefixed */
    readonly values: Record<string, string>;
    get(key: string): string | undefined;
    set(key: string, value: string | undefined, options?: HashWriteOptions): void;
    update(patch: Record<string, string | undefined>, options?: HashWriteOptions): void;
    /** called on any change, including the back button; returns an unsubscribe function */
    observe(listener: (values: Record<string, string>) => void): () => void;
    /** detach from the URL; the instance keeps working in memory */
    stop(): void;
}
export declare function hashState(options?: HashStateOptions): HashState;
