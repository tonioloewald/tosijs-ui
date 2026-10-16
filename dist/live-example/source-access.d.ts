/** Set on a source read the dev server admitted; nothing else sends it. */
export declare const SOURCE_ACCESS_HEADER = "x-tosijs-source";
/** Whether `/__docstore/source` admits this page, asked at most once per page. */
export declare function sourceAccess(file: string, fetcher?: typeof fetch): Promise<boolean>;
/** Forget the answer (tests). */
export declare function resetSourceAccess(): void;
