import { RemotePayload } from './types';
export declare const STORAGE_KEY = "live-example-payload";
export declare function createRemoteKey(prefix: string, uuid: string, remoteId: string): string;
export declare function sendPayload(storageKey: string, payload: RemotePayload): void;
export declare function parsePayload(data: string | null): RemotePayload | null;
export declare function openEditorWindow(prefix: string, uuid: string, storageKey: string, remoteKey: string, code: {
    css: string;
    html: string;
    js: string;
    test?: string;
}): void;
export declare function sendCloseSignal(storageKey: string, remoteKey: string): void;
/**
 * Manager for remote window synchronization.
 *
 * Primary transport: BroadcastChannel (reliable, instant, works when
 * tabs close). Falls back to localStorage polling for environments
 * that lack BroadcastChannel (e.g. older Quest 3 browser builds).
 *
 * localStorage is still used for the initial payload (persisted so the
 * new window can read it on first render).
 */
export declare class RemoteSyncManager {
    private storageKey;
    private remoteKey;
    private lastUpdate;
    private interval?;
    private channel?;
    private listening;
    private onReceive;
    constructor(storageKey: string, remoteKey: string, onReceive: (payload: RemotePayload) => void);
    private handlePayload;
    /** Handle incoming BroadcastChannel messages */
    private handleMessage;
    /** Polling fallback — reads from localStorage */
    private handlePoll;
    startListening(): void;
    stopListening(): void;
    send(code: {
        css: string;
        html: string;
        js: string;
        test?: string;
    }): void;
    sendClose(): void;
}
