/*
The page's side of the dev server's test checklists (#4147): read the posted list, send an
answer. No components here, so it imports without a DOM: the dev server reads the snippet, and
a client that draws the list itself (tosijs-3d answers in a scene or a headset) imports it as
`tosijs-ui/checklist-client` (#4194).
*/
/** The list's sections, with every item given an id the way the dev server's store does. */
export function checklistSections(spec) {
    if (!spec)
        return [];
    const sections = spec.sections ?? (spec.items ? [{ items: spec.items }] : []);
    return sections.map((section, s) => ({
        title: section.title,
        items: (section.items ?? []).map((raw, i) => {
            const item = typeof raw === 'string' ? { text: raw } : raw;
            return { ...item, id: item.id ?? `s${s + 1}-${i + 1}` };
        }),
    }));
}
/** Injected by the dev server into the pages it serves: there is a checklist endpoint to ask. */
export const CHECKLIST_ENDPOINT_SNIPPET = '<script>window.__tosiChecklist=true</script>';
export const CHECKLIST_ENDPOINT = '/__checklist';
let endpoint = CHECKLIST_ENDPOINT;
/** Where the page asks: where your server mounted `checklistHandler`. */
export function setChecklistEndpoint(path) {
    endpoint = path.replace(/\/+$/, '') || CHECKLIST_ENDPOINT;
}
const KEEPALIVE_LIMIT = 60_000;
/** Whether the page was served by a dev server with a checklist endpoint. */
export const hasChecklistEndpoint = () => typeof window !== 'undefined' &&
    window.__tosiChecklist === true;
/** The posted list and its answers, or null when this page may not see it (or there is none). */
export async function fetchChecklist(fetcher = fetch) {
    try {
        const response = await fetcher(endpoint, { cache: 'no-store' });
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
        const response = await fetcher(`${endpoint}/answer`, {
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
