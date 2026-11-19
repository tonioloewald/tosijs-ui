/*
The page's side of the dev server's test checklists (#4147): read the posted list, send an
answer. No components here, so the dev server can import the snippet without a DOM.
*/
/** Injected by the dev server into the pages it serves: there is a checklist endpoint to ask. */
export const CHECKLIST_ENDPOINT_SNIPPET = '<script>window.__tosiChecklist=true</script>';
export const CHECKLIST_ENDPOINT = '/__checklist';
const KEEPALIVE_LIMIT = 60_000;
/** Whether the page was served by a dev server with a checklist endpoint. */
export const hasChecklistEndpoint = () => typeof window !== 'undefined' &&
    window.__tosiChecklist === true;
/** The posted list and its answers, or null when this page may not see it (or there is none). */
export async function fetchChecklist(fetcher = fetch) {
    try {
        const response = await fetcher(CHECKLIST_ENDPOINT, { cache: 'no-store' });
        if (!response.ok)
            return null;
        const state = (await response.json());
        return state.list ? state : null;
    }
    catch {
        return null;
    }
}
async function gzip(text) {
    const stream = new Blob([text])
        .stream()
        .pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}
/** Send one answer, gzipped. Resolves to an error message, or null when it saved. */
export async function sendChecklistAnswer(body, fetcher = fetch) {
    try {
        const zipped = await gzip(JSON.stringify(body));
        const response = await fetcher(`${CHECKLIST_ENDPOINT}/answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Encoding': 'gzip',
            },
            body: zipped,
            // Outlives the page (a comment saved as the tab closes), but browsers cap a
            // keepalive body at 64KB, so a large schematic goes as an ordinary request.
            keepalive: zipped.byteLength < KEEPALIVE_LIMIT,
        });
        if (response.ok)
            return null;
        return (await response.text().catch(() => '')) || `${response.status}`;
    }
    catch (e) {
        return e.message;
    }
}
