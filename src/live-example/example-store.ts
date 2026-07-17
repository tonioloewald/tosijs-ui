/*
Per-example local edit scratchpad.

Live examples can be edited in place; this persists those edits to the browser
(localStorage) keyed by the source-to-doc map (sourceFile + ordinal) so they
survive reloads. Per-browser, no server — the local-only flavor of the DocStore
example scratchpad. An example with no source map can't be keyed, so it isn't
persisted.
*/

const PREFIX = 'tosi-example-edit:'

export interface ExampleEdit {
  js?: string
  html?: string
  css?: string
  test?: string
  // The transpiled JS for `js` (tjs/ts dialects), so a restored local edit runs
  // without reloading the transpiler — see self-contained-examples-plan.md slice 4.
  // Absent for `js`-dialect examples (they need no transpiler) and older saves.
  compiledJs?: string
}

/** Stable key for an example, from its source↔doc map attributes. */
export function exampleEditKey(
  sourceFile: string,
  ordinal: string | number
): string {
  return `${PREFIX}${sourceFile}#${ordinal}`
}

export function saveExampleEdit(key: string, edit: ExampleEdit): void {
  try {
    localStorage.setItem(key, JSON.stringify(edit))
  } catch (e) {
    console.warn('example-store: save failed', e)
  }
}

export function loadExampleEdit(key: string): ExampleEdit | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as ExampleEdit) : null
  } catch {
    return null
  }
}

export function clearExampleEdit(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function hasExampleEdit(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null
  } catch {
    return false
  }
}
