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
 * Manager for remote window synchronization via localStorage/StorageEvent
 */
export declare class RemoteSyncManager {
    private storageKey;
    private remoteKey;
    private lastUpdate;
    private interval?;
    private onReceive;
    constructor(storageKey: string, remoteKey: string, onReceive: (payload: RemotePayload) => void);
    private handleChange;
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
