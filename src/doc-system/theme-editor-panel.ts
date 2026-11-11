/*
The doc site's theme editor: a floating panel, opened from the settings menu ("Theme Editor…")
in an editing session, that edits the site's `themeFile` and saves it back.

Offered only where the dev server would accept the save: the page must have the source
endpoint, and `/__docstore/source` must admit it for the theme file (localhost, trusted LAN, or
a tunnel edit session). A deployed site has neither, so the item never appears there.

Saving writes the file through the same endpoint as save-to-source; the watcher rebuilds, and
the build writes the theme into the site's stylesheet, so the next load paints it first time.
Closing without saving takes the preview away and leaves the page on the saved theme.
*/

import { StyleSheet, elements } from 'tosijs'
import { tosiFloat, TosiFloat } from '../float.js'
import { tosiThemeEditor, TosiThemeEditor } from '../theme-editor.js'
import type { ThemeData } from '../theme-data.js'
import {
  DOC_SYSTEM_THEME_VARIABLES,
  docSystemThemeGenerator,
} from './doc-system-styles.js'
import {
  hasSourceEndpoint,
  sourceAccess,
} from '../live-example/source-access.js'

const { div, span, button } = elements

/** The id of the stylesheet the panel previews the theme through. */
export const THEME_PREVIEW_STYLE_ID = 'tosi-theme-preview'

export interface ThemeEditorSite {
  /** the project-relative theme file (`SiteConfig.themeFile`) */
  file: string
  /** the site's base colours (`SiteConfig.theme`) */
  theme?: Record<string, string>
}

/** Whether this page may save the theme: asked once, then cached by sourceAccess. */
export const themeEditable = (file: string): Promise<boolean> =>
  hasSourceEndpoint() ? sourceAccess(file) : Promise.resolve(false)

const sourceUrl = (file: string) =>
  `/__docstore/source?file=${encodeURIComponent(file)}`

/** The saved theme, or an empty one if nothing has been saved yet (the server's 204). */
export async function loadTheme(
  file: string,
  fetcher: typeof fetch = fetch
): Promise<ThemeData> {
  const response = await fetcher(sourceUrl(file))
  if (response.status === 204) return { base: {} }
  if (!response.ok) {
    throw new Error(`could not read ${file}: ${response.status}`)
  }
  const data = JSON.parse(await response.text())
  return data && typeof data === 'object' ? { base: {}, ...data } : { base: {} }
}

/** Save the theme; resolves to an error message, or null when it saved. */
export async function saveTheme(
  file: string,
  theme: ThemeData,
  fetcher: typeof fetch = fetch
): Promise<string | null> {
  const response = await fetcher('/__docstore/source', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file,
      content: JSON.stringify(theme, null, 2) + '\n',
    }),
  })
  if (response.ok) return null
  const detail = await response.text().catch(() => '')
  try {
    return JSON.parse(detail).error ?? `save failed (${response.status})`
  } catch {
    return detail || `save failed (${response.status})`
  }
}

let open: TosiFloat | null = null
let styled = false

// Fixed colours, like the editor's own: no theme being edited can make the panel unreadable.
const panelStyles = {
  '.theme-editor-panel': {
    position: 'fixed',
    top: '64px',
    right: '16px',
    zIndex: '1000',
    background: '#ffffff',
    color: '#222222',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '13px',
    maxHeight: 'calc(100vh - 80px)',
    display: 'flex',
    flexDirection: 'column',
    colorScheme: 'light',
  },
  '.theme-editor-panel tosi-theme-editor': {
    boxShadow: 'none',
    overflowY: 'auto',
    minHeight: '0',
  },
  '.theme-panel-title, .theme-panel-actions': {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
  },
  '.theme-panel-title': {
    cursor: 'move',
    fontWeight: '600',
    borderBottom: '1px solid #e4e4e4',
  },
  '.theme-panel-title span, .theme-panel-status': { flex: '1' },
  '.theme-panel-actions': { borderTop: '1px solid #e4e4e4' },
  '.theme-panel-status': { color: '#555' },
  '.theme-editor-panel button': {
    padding: '4px 12px',
    border: '1px solid #bbb',
    borderRadius: '4px',
    background: '#f5f5f5',
    color: '#222',
    font: 'inherit',
    cursor: 'pointer',
  },
  '.theme-editor-panel button:focus-visible': {
    outline: '2px solid #0064d2',
    outlineOffset: '1px',
  },
}

/** Open the panel, or bring it forward if it is already open. */
export async function openThemeEditor(site: ThemeEditorSite): Promise<void> {
  if (open?.isConnected) {
    open.querySelector<HTMLElement>('tosi-theme-editor')?.focus()
    return
  }
  if (!styled) {
    StyleSheet('tosi-theme-editor-panel', panelStyles)
    styled = true
  }
  const value = await loadTheme(site.file)
  const editor = tosiThemeEditor({
    class: 'no-drag',
    applyId: THEME_PREVIEW_STYLE_ID,
    generator: {
      ...docSystemThemeGenerator,
      defaults: { ...docSystemThemeGenerator.defaults, ...(site.theme ?? {}) },
    },
    variables: DOC_SYSTEM_THEME_VARIABLES,
    value,
  }) as TosiThemeEditor
  const status = span({ class: 'theme-panel-status', role: 'status' })
  let saved = JSON.stringify(value)

  const close = () => {
    document.getElementById(THEME_PREVIEW_STYLE_ID)?.remove()
    panel.remove()
    open = null
  }
  const save = async () => {
    status.textContent = 'Saving…'
    const problem = await saveTheme(site.file, editor.value)
    if (problem) {
      status.textContent = problem
    } else {
      saved = JSON.stringify(editor.value)
      status.textContent = `Saved to ${site.file}`
    }
  }
  editor.addEventListener('change', () => {
    status.textContent =
      JSON.stringify(editor.value) === saved ? '' : 'Not saved'
  })

  const panel = tosiFloat(
    {
      drag: true,
      remainOnResize: 'remain',
      remainOnScroll: 'remain',
      class: 'theme-editor-panel',
      role: 'dialog',
      ariaLabel: 'Theme editor',
    },
    div(
      { class: 'theme-panel-title' },
      span('Theme'),
      button(
        {
          class: 'no-drag',
          ariaLabel: 'Close the theme editor',
          onClick: close,
        },
        '×'
      )
    ),
    editor,
    div(
      { class: 'theme-panel-actions no-drag' },
      status,
      button({ onClick: save }, 'Save')
    )
  ) as TosiFloat
  open = panel
  document.body.append(panel)
}
