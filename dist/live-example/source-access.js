/*
May this page save a live example back to its source file?

On localhost, yes: the dev server admits loopback. Anywhere else the answer is the server's,
not the hostname's: a LAN device under `trustLan` and a tunnel visitor with an edit session may
save. The dev server marks the pages it serves with `editableSources` on
(`SOURCE_ENDPOINT_SNIPPET`), so only those pages ask, and a deployed static site, which has no
endpoint, never gets the request. The ask is a HEAD of the read the save itself would make,
and only an answer carrying the dev server's own header counts.

Cached per file, because the server's allow-list is per file.
*/
/** Set on a source read the dev server admitted; nothing else sends it. */
export const SOURCE_ACCESS_HEADER = 'x-tosijs-source';
/** Injected by the dev server into pages it serves with `editableSources` on. */
export const SOURCE_ENDPOINT_SNIPPET = '<script>window.__tosiSourceEndpoint=true</script>';
/**
 * What a reader refused over the LAN is told, in one place for the page editor and live
 * examples. It names the forms that are hard to leave on by accident: a one-run environment
 * variable, or a named network in the config.
 */
export const LAN_REFUSAL_ADVICE = 'If you opened this over the LAN (a `.local` or local IP address), invite links will not help: ' +
    'start the dev server with TOSIJS_TRUST_LAN=1, or name your network in the site config ' +
    "(trustLan: '192.168.1.0/24'), or use its tunnel URL instead.";
const answers = new Map();
const known = new Map();
/** Whether the page was served by a dev server with a source endpoint. */
export const hasSourceEndpoint = () => typeof window !== 'undefined' &&
    window.__tosiSourceEndpoint === true;
/** Whether `/__docstore/source` admits this page for `file`, asked once per file. */
export function sourceAccess(file, fetcher = fetch) {
    let answer = answers.get(file);
    if (!answer) {
        answer = fetcher(`/__docstore/source?file=${encodeURIComponent(file)}`, {
            method: 'HEAD',
        })
            .then((response) => response.ok &&
            response.headers.get(SOURCE_ACCESS_HEADER) === 'editable')
            .catch(() => false)
            .then((ok) => {
            known.set(file, ok);
            return ok;
        });
        answers.set(file, answer);
    }
    return answer;
}
/** The answer for `file` if it has arrived; false until then. */
export const sourceWritable = (file) => known.get(file) === true;
/** Forget every answer (tests). */
export function resetSourceAccess() {
    answers.clear();
    known.clear();
}
