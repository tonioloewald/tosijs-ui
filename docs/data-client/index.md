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
