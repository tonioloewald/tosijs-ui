/*
The page's side of the dev server's test checklists (#4147): read the posted list, send an
answer. No components here, so the dev server can import the snippet without a DOM.
*/

import type { ChecklistSpec, ChecklistItemAnswer } from '../checklist.js'

/** Injected by the dev server into the pages it serves: there is a checklist endpoint to ask. */
export const CHECKLIST_ENDPOINT_SNIPPET =
  '<script>window.__tosiChecklist=true</script>'

export const CHECKLIST_ENDPOINT = '/__checklist'
let endpoint = CHECKLIST_ENDPOINT

/** Where the page asks: where your server mounted `checklistHandler`. */
export function setChecklistEndpoint(path: string): void {
  endpoint = path.replace(/\/+$/, '') || CHECKLIST_ENDPOINT
}
const KEEPALIVE_LIMIT = 60_000

/** Whether the page was served by a dev server with a checklist endpoint. */
export const hasChecklistEndpoint = (): boolean =>
  typeof window !== 'undefined' &&
  (window as { __tosiChecklist?: boolean }).__tosiChecklist === true

export interface ChecklistState {
  list: (ChecklistSpec & { id: string }) | null
  answers: Record<string, ChecklistItemAnswer>
  total: number
  pass: number
  fail: number
  open: number
}

/** The posted list and its answers, or null when this page may not see it (or there is none). */
export async function fetchChecklist(
  fetcher: typeof fetch = fetch
): Promise<ChecklistState | null> {
  try {
    const response = await fetcher(endpoint, { cache: 'no-store' })
    if (!response.ok) return null
    const state = (await response.json()) as ChecklistState
    return state.list ? state : null
  } catch {
    return null
  }
}

export interface ChecklistAnswerBody {
  listId: string
  itemId: string
  verdict: 'pass' | 'fail' | null
  comment: string
  page?: string
  schematic?: string
}

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text])
    .stream()
    .pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Send one answer, gzipped. Resolves to an error message, or null when it saved. */
export async function sendChecklistAnswer(
  body: ChecklistAnswerBody,
  fetcher: typeof fetch = fetch
): Promise<string | null> {
  try {
    const zipped = await gzip(JSON.stringify(body))
    const response = await fetcher(`${endpoint}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
      },
      body: zipped as BodyInit,
      // Outlives the page (a comment saved as the tab closes), but browsers cap a
      // keepalive body at 64KB, so a large schematic goes as an ordinary request.
      keepalive: zipped.byteLength < KEEPALIVE_LIMIT,
    })
    if (response.ok) return null
    return (await response.text().catch(() => '')) || `${response.status}`
  } catch (e) {
    return (e as Error).message
  }
}
