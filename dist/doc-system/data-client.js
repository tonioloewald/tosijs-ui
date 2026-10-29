/*{ "parent": "Documentation System", "order": 85, "description": "Open and save a project's data files from a dev-server page, for in-browser tools such as level or scene editors, optionally committing each save." }*/
/*#
# data client

For an editor running on a dev-server page (a level editor, a scene editor) to open and save
the project's data files through `/__docstore/data`. Turn it on by naming the folders in the
site config; [`editableData`](/doc-site-system/) in the doc-site system reference has the
rules.

```typescript
// tosijs-site.config.ts
editableData: { dirs: ['static/levels'], commit: true }
```

```typescript
import { listData, readData, saveData, dataHistory } from 'tosijs-ui/doc-system/data-client'

const { files } = await listData()
const level = await readData('static/levels/ocean.json', { json: true })
level.spawn = [0, 2, 0]
const { commit } = await saveData('static/levels/ocean.json', level)
const versions = await dataHistory('static/levels/ocean.json')
if (versions.length > 1) {
  const before = await readData('static/levels/ocean.json', { at: versions[1].commit })
}
```

`saveData` writes an object as JSON (two-space indent, trailing newline) and a string as it
is. With `commit: true` in the config each save is its own commit, and `commit` in the result
is its hash (`null` when the save changed nothing). A save that wrote but could not commit
(a failing hook, or a repository mid-rebase) resolves with `commitError` set rather than
rejecting, because the file was saved. Each committed save runs git and the repository's
hooks before it answers, so it suits an explicit Save, not autosave.

**Dev server only.** Everything else rejects with a `DataStoreError` whose `status` says why:
`501` when the server has no `editableData`, `403` when this page may not edit files here or
the file is not editable, `400` for content it refuses (JSON that does not parse). A response
that is not the endpoint's (a deployed site's catch-all answering with a page) rejects too, so
`listData()` is the probe for whether to offer saving at all.

File names may use letters, digits, `-`, `_`, `.`, `/` and spaces. `dataHistory` returns the
latest 100 versions.
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
    /*
    The endpoint answers JSON or the file's text, never a page. An HTML answer is something
    else's: a static host's catch-all serving its index for every path.
    */
    const type = response.headers.get('content-type') ?? '';
    if (response.ok && type.includes('text/html')) {
        throw new DataStoreError(`${init?.method ?? 'GET'} ${ENDPOINT}${query}: answered with a page, not the data endpoint (no dev server here?)`, response.status);
    }
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
