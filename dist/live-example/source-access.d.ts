/** Set on a source read the dev server admitted; nothing else sends it. */
export declare const SOURCE_ACCESS_HEADER = "x-tosijs-source";
/** Injected by the dev server into pages it serves with `editableSources` on. */
export declare const SOURCE_ENDPOINT_SNIPPET = "<script>window.__tosiSourceEndpoint=true</script>";
/** Whether the page was served by a dev server with a source endpoint. */
export declare const hasSourceEndpoint: () => boolean;
/** Whether `/__docstore/source` admits this page for `file`, asked once per file. */
export declare function sourceAccess(file: string, fetcher?: typeof fetch): Promise<boolean>;
/** The answer for `file` if it has arrived; false until then. */
export declare const sourceWritable: (file: string) => boolean;
/** Forget every answer (tests). */
export declare function resetSourceAccess(): void;
