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
