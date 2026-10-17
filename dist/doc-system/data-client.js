/*{ "parent": "Documentation System", "order": 85 }*/
/*#
# data client

For an editor running on a dev-server page (a level editor, a scene editor) to open and save
the project's data files through `/__docstore/data`, which the site config's `editableData`
turns on (see the doc-site system reference). Dev server only: on a deployed site every call
rejects, so an editor can offer saving only where it works.

```typescript
import { listData, readData, saveData, dataHistory } from 'tosijs-ui/doc-system/data-client'

const { files } = await listData()
const level = await readData('static/levels/ocean.json', { json: true })
level.spawn = [0, 2, 0]
const { commit } = await saveData('static/levels/ocean.json', level)
const versions = await dataHistory('static/levels/ocean.json')
const before = await readData('static/levels/ocean.json', { at: versions[1].commit })
```

`saveData` writes an object as JSON (two-space indent, trailing newline) and a string as it
is. With `commit: true` in the config each save is its own commit, and `commit` in the result
is its hash (`null` when the save changed nothing). A save that wrote but could not commit
resolves with `commitError` set rather than rejecting, because the file was saved.
*/
const ENDPOINT = '/__docstore/data';
export class DataStoreError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = 'DataStoreError';
    }
}
async function ask(query, init) {
    const response = await fetch(`${ENDPOINT}${query}`, {
        credentials: 'same-origin',
        ...init,
    });
    if (!response.ok) {
        const text = await response.text();
        let message = text;
        try {
            message = JSON.parse(text).error ?? text;
        }
        catch {
            // plain text
        }
        throw new DataStoreError(`${init?.method ?? 'GET'} ${ENDPOINT}${query}: ${response.status} ${message}`, response.status);
    }
    return response;
}
const q = (params) => '?' + new URLSearchParams(params).toString();
/** Every editable file, project-relative, newest first. */
export async function listData() {
    return (await ask('?list')).json();
}
export async function readData(file, options = {}) {
    const params = { file };
    if (options.at)
        params.at = options.at;
    const text = await (await ask(q(params))).text();
    return options.json ? JSON.parse(text) : text;
}
/** Save a file: a string as it is, anything else as formatted JSON. */
export async function saveData(file, content) {
    const text = typeof content === 'string'
        ? content
        : JSON.stringify(content, null, 2) + '\n';
    return (await ask('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, content: text }),
    })).json();
}
/** A file's committed versions, newest first. */
export async function dataHistory(file) {
    return (await (await ask(q({ history: file }))).json()).versions;
}
