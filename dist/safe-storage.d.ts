/** The stored value, or `null` when there is none or storage is unavailable. */
export declare function storageGet(key: string): string | null;
/** Store a value; false when storage is unavailable or full. */
export declare function storageSet(key: string, value: string): boolean;
