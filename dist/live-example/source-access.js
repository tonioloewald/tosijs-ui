/*
May this page save a live example back to its source file?

On localhost, yes: the dev server admits loopback. Anywhere else the answer is the server's,
not the hostname's. A LAN device under `trustLan` and a tunnel visitor with an edit session
may save; a deployed static site has no endpoint. So ask once, with the read the save itself
would make, and believe only an answer that carries the dev server's own header: a static
host that rewrites every path to index.html also answers 200.
*/
/** Set on a source read the dev server admitted; nothing else sends it. */
export const SOURCE_ACCESS_HEADER = 'x-tosijs-source';
let probe = null;
/** Whether `/__docstore/source` admits this page, asked at most once per page. */
export function sourceAccess(file, fetcher = fetch) {
    probe ??= fetcher(`/__docstore/source?file=${encodeURIComponent(file)}`)
        .then((response) => response.ok && response.headers.get(SOURCE_ACCESS_HEADER) === 'editable')
        .catch(() => false);
    return probe;
}
/** Forget the answer (tests). */
export function resetSourceAccess() {
    probe = null;
}
