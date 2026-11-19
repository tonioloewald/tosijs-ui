/*
The doc site's test checklist (#4147): a badge on every page the dev server serves while an
agent's list is waiting, and a floating panel to answer it in.

Each 👍 or 👎 sends the answer with a schematic of the page as it is at that moment (see
page-schematic.ts), so the agent sees what the reader saw. Comments are sent as they change,
without a new schematic. Answers are saved on the server as they are given, so a closed tab
loses nothing, and the panel reopens after a navigation that reloads the page.

A deployed site has no endpoint, so nothing here runs there; a reader the server does not
admit (over the tunnel without an edit session) gets no badge.

Outside the doc site, import it from `tosijs-ui/checklist-panel` and call `watchChecklist()`
on pages served by a server that mounts `checklistHandler` (`tosijs-ui/site`).
*/

import { StyleSheet, elements } from 'tosijs'
import { tosiFloat, TosiFloat } from '../float.js'
import {
  tosiChecklist,
  TosiChecklist,
  type ChecklistChange,
  type ChecklistItemAnswer,
} from '../checklist.js'
import { pageSchematic } from '../page-schematic.js'
import {
  fetchChecklist,
  sendChecklistAnswer,
  setChecklistEndpoint,
  type ChecklistState,
} from './checklist-client.js'

const { div, span, button } = elements

/** Left out of the schematic: the panel and the badge are not the page under test. */
const SKIP = '[data-schematic-skip]'
const OPEN_KEY = 'tosi-checklist-open'
const POLL_MS = 15_000
const COMMENT_PAUSE_MS = 600

let state: ChecklistState | null = null
let panel: TosiFloat | null = null
let badge: HTMLButtonElement | null = null
let started = false
// Answers given here whose save has not landed yet (waiting out the pause, or in flight).
const unsaved = new Map<string, ChecklistItemAnswer>()
// Saves any comment still waiting out its pause (closing, or leaving the page).
let flushComments = (): void => {}

const remember = (open: boolean) => {
  try {
    if (open) sessionStorage.setItem(OPEN_KEY, '1')
    else sessionStorage.removeItem(OPEN_KEY)
  } catch {
    // storage blocked: the panel just will not reopen by itself
  }
}

const remembered = (): boolean => {
  try {
    return sessionStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

// Fixed colours, like the theme editor's panel: the page's theme cannot make it unreadable.
const panelStyles = {
  '.checklist-panel': {
    position: 'fixed',
    top: '64px',
    right: '16px',
    zIndex: '1000',
    width: 'min(420px, calc(100vw - 32px))',
    maxHeight: 'calc(100vh - 80px)',
    display: 'flex',
    flexDirection: 'column',
    background: '#ffffff',
    color: '#222222',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '16px',
    colorScheme: 'light',
  },
  '.checklist-panel tosi-checklist': {
    overflowY: 'auto',
    minHeight: '0',
    padding: '8px 12px',
  },
  '.checklist-panel-title, .checklist-panel-status': {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
  },
  '.checklist-panel-title': {
    cursor: 'move',
    fontWeight: '600',
    borderBottom: '1px solid #e4e4e4',
  },
  '.checklist-panel-title span': { flex: '1' },
  '.checklist-panel-status': {
    borderTop: '1px solid #e4e4e4',
    color: '#555',
    minHeight: '1.4em',
  },
  '.checklist-panel-status:empty': { display: 'none' },
  '.checklist-panel button.close': {
    padding: '2px 10px',
    border: '1px solid #bbb',
    borderRadius: '4px',
    background: '#f5f5f5',
    color: '#222',
    font: 'inherit',
    cursor: 'pointer',
  },
  '.checklist-badge': {
    position: 'fixed',
    left: '16px',
    bottom: '16px',
    zIndex: '1000',
    padding: '8px 14px',
    border: 'none',
    borderRadius: '999px',
    background: '#0064d2',
    color: '#ffffff',
    font: '600 14px system-ui, -apple-system, sans-serif',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
    cursor: 'pointer',
  },
  '.checklist-badge:focus-visible, .checklist-panel button:focus-visible': {
    outline: '2px solid #222',
    outlineOffset: '2px',
  },
}

let styled = false
const ensureStyles = () => {
  if (styled) return
  StyleSheet('tosi-checklist-panel', panelStyles)
  styled = true
}

function updateBadge(): void {
  const waiting = state && state.open > 0 && !panel?.isConnected
  if (!waiting) {
    badge?.remove()
    return
  }
  ensureStyles()
  if (!badge) {
    badge = button({
      class: 'checklist-badge',
      dataSchematicSkip: '',
      onClick: () => void openChecklist(),
    }) as HTMLButtonElement
  }
  const open = state!.open
  badge.textContent = `${open} ${open === 1 ? 'check' : 'checks'} waiting`
  badge.setAttribute('aria-label', `Test checklist: ${badge.textContent}`)
  if (!badge.isConnected) document.body.append(badge)
}

/** Whether there is a list to answer (for the settings menu). */
export const checklistWaiting = (): boolean => state !== null

async function refresh(): Promise<void> {
  const next = await fetchChecklist()
  const replaced = next?.list?.id !== state?.list?.id
  state = next
  const editor = panel?.querySelector<TosiChecklist>('tosi-checklist')
  if (editor) {
    if (!state) {
      closeChecklist()
      return
    }
    if (replaced) {
      unsaved.clear()
      editor.value = state.list
      editor.answers = state.answers
    } else {
      // What this reader has given and not yet seen saved wins over the server's copy.
      editor.answers = { ...state.answers, ...Object.fromEntries(unsaved) }
    }
  }
  updateBadge()
}

/** Close the panel; the badge comes back while there is something left to check. */
export function closeChecklist(): void {
  flushComments()
  panel?.remove()
  panel = null
  remember(false)
  updateBadge()
}

/** Open the panel, or bring it forward. */
export async function openChecklist(): Promise<void> {
  if (panel?.isConnected) {
    panel.querySelector<HTMLElement>('tosi-checklist')?.focus()
    return
  }
  if (!state) await refresh()
  if (!state?.list) return
  ensureStyles()
  const status = span({ class: 'checklist-panel-status', role: 'status' })
  const editor = tosiChecklist({
    class: 'no-drag',
    value: state.list,
    answers: state.answers,
  }) as TosiChecklist
  // One send at a time, so an older comment never lands after a newer one.
  let sending: Promise<void> = Promise.resolve()
  // The list is the one answered when the change was made, so a replaced list is a 409.
  const send = (change: ChecklistChange, listId: string): Promise<void> =>
    (sending = sending.then(async () => {
      status.textContent = 'Saving…'
      const problem = await sendChecklistAnswer({
        listId,
        itemId: change.itemId,
        verdict: change.verdict,
        comment: change.comment,
        page: location.href,
        ...(change.changed === 'verdict'
          ? { schematic: pageSchematic({ skip: SKIP }) }
          : {}),
      })
      const sent = unsaved.get(change.itemId)
      if (
        !pending.has(change.itemId) &&
        sent?.verdict === change.verdict &&
        sent?.comment === change.comment
      ) {
        unsaved.delete(change.itemId)
      }
      status.textContent = problem ?? ''
      if (problem) await refresh()
      else if (state) {
        state.answers = {
          ...state.answers,
          [change.itemId]: { verdict: change.verdict, comment: change.comment },
        }
        state.open = editorOpenCount(editor)
      }
    }))
  // Comments save as they are typed, once typing pauses; a verdict saves at once.
  const typed = new Map<string, ReturnType<typeof setTimeout>>()
  const pending = new Map<string, { change: ChecklistChange; listId: string }>()
  const flush = (itemId: string): void => {
    clearTimeout(typed.get(itemId))
    typed.delete(itemId)
    const queued = pending.get(itemId)
    pending.delete(itemId)
    if (queued) send(queued.change, queued.listId)
  }
  flushComments = () => [...pending.keys()].forEach(flush)
  editor.addEventListener('change', (event) => {
    const change = (event as CustomEvent<ChecklistChange>).detail
    if (!change?.itemId || !state?.list) return
    const listId = state.list.id
    unsaved.set(change.itemId, {
      verdict: change.verdict,
      comment: change.comment,
    })
    if (change.changed === 'comment') {
      pending.set(change.itemId, { change, listId })
      clearTimeout(typed.get(change.itemId))
      typed.set(
        change.itemId,
        setTimeout(() => flush(change.itemId), COMMENT_PAUSE_MS)
      )
      return
    }
    // A verdict carries the comment as it stands, so a pending one is superseded.
    clearTimeout(typed.get(change.itemId))
    typed.delete(change.itemId)
    pending.delete(change.itemId)
    send(change, listId)
  })
  panel = tosiFloat(
    {
      drag: true,
      remainOnResize: 'remain',
      remainOnScroll: 'remain',
      class: 'checklist-panel',
      role: 'dialog',
      ariaLabel: 'Test checklist',
      dataSchematicSkip: '',
    },
    div(
      { class: 'checklist-panel-title' },
      span('Test checklist'),
      button(
        {
          class: 'close no-drag',
          ariaLabel: 'Close the test checklist',
          onClick: closeChecklist,
        },
        '×'
      )
    ),
    editor,
    status
  ) as TosiFloat
  document.body.append(panel)
  remember(true)
  updateBadge()
}

function editorOpenCount(editor: TosiChecklist): number {
  const ids = [...(editor.shadowRoot?.querySelectorAll('.item') ?? [])].map(
    (item) => item.getAttribute('data-id')!
  )
  return ids.filter((id) => !editor.answers[id]?.verdict).length
}

export interface WatchChecklistOptions {
  /** Where your server mounted `checklistHandler` (default `/__checklist`). */
  endpoint?: string
}

/**
 * Show a badge while a list is waiting, and the panel to answer it. Call it once, on pages
 * served by a server with the endpoints; only in development, since anyone the server admits
 * sees the list. The doc site calls it for you.
 */
export function watchChecklist(options: WatchChecklistOptions = {}): void {
  // A test runner's hidden frame or an embedded example is not where anyone answers.
  if (started || window.top !== window) return
  if (options.endpoint) setChecklistEndpoint(options.endpoint)
  started = true
  void refresh().then(() => {
    if (state && remembered()) void openChecklist()
  })
  // A list posted after the page loaded shows up within POLL_MS, or when the tab comes back.
  setInterval(() => {
    if (document.visibilityState === 'visible') void refresh()
  }, POLL_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refresh()
    else flushComments()
  })
  window.addEventListener('pagehide', () => flushComments())
}

export { setChecklistEndpoint } from './checklist-client.js'
