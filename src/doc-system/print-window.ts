/*
When to call `print()` on a freshly-opened window.

Extracted from the Print menu action (review F15). It was ~8 lines inline inside a menu-item
callback, it changed twice in one release cycle, and it had no test at any tier.

The two changes, so the shape is not rediscovered:

  1. `autoPrint: true` used to make the book-HTML builder inject its own `load` wait. Turning
     that off — so the page could be syntax-highlighted before printing — dropped the wait with
     it, and printing raced the render.
  2. Restoring the wait is what this function is.

Both failure modes are silent in the worst way: a print dialog that opens over a half-rendered
page, or one that never opens at all. Neither throws, and you only find out by printing.
*/

/** The minimum `window` surface this needs — so a test can supply a fake. */
export interface PrintableWindow {
  document: { readyState: string }
  addEventListener: (
    type: string,
    handler: () => void,
    options?: { once?: boolean }
  ) => void
  print: () => void
}

export interface PrintWhenReadyOptions {
  /**
   * Settle time between highlighting and `print()`. A real browser needs a beat to lay the
   * tokens out; a test passes 0.
   */
  delayMs?: number
  /** Injected for tests. */
  setTimeoutFn?: (fn: () => void, ms: number) => unknown
}

/**
 * Highlight, then print — after the window has actually loaded.
 *
 * Returns a promise that resolves once `print()` has been scheduled, so a caller (or a test)
 * can await the decision rather than the dialog.
 *
 * A failing highlight still prints. Plain code beats a print dialog that never opens: the
 * reader asked for a document, and an un-highlighted one is a worse document rather than no
 * document.
 */
export function printWhenReady(
  win: PrintableWindow,
  highlight: () => Promise<unknown>,
  opts: PrintWhenReadyOptions = {}
): Promise<void> {
  const { delayMs = 300, setTimeoutFn = setTimeout } = opts
  return new Promise<void>((resolve) => {
    const go = (): void => {
      void highlight()
        .catch(() => {
          // Deliberately swallowed — see the note above. The print must still happen.
        })
        .then(() => {
          setTimeoutFn(() => win.print(), delayMs)
          resolve()
        })
    }
    /*
    `complete` means the load event has already fired, so listening for it would wait forever.
    This is the branch that matters in practice: a window opened with pre-rendered HTML is
    frequently already complete by the time the menu action runs.
    */
    if (win.document.readyState === 'complete') go()
    else win.addEventListener('load', go, { once: true })
  })
}

export interface ResolveBookCoverOptions {
  /** Injected for tests. */
  fetchFn?: (
    url: string
  ) => Promise<{ ok: boolean; json: () => Promise<unknown> }>
  /** Resolves when the image at `url` loads, rejects when it does not. Injected for tests. */
  loadImage?: (url: string) => Promise<unknown>
}

const loadImageInPage = (url: string): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = resolve
    img.onerror = reject
    img.src = url
  })

/**
 * The cover Print should open with, or `undefined` for none.
 *
 * Reads the default volume's `coverUrl` from the volume manifest the site build wrote, then
 * loads the image before answering. Both steps are checks on purpose: the manifest lists a
 * cover only when the build wrote one, and loading it here means the printed book never
 * starts with a broken image and a page break — without an inline `onerror`, which a
 * Content-Security-Policy would block in the popup.
 *
 * Any failure means no cover. Print must still happen.
 */
export async function resolveBookCover(
  manifestUrl: string | undefined,
  opts: ResolveBookCoverOptions = {}
): Promise<string | undefined> {
  if (!manifestUrl) return undefined
  const { fetchFn = fetch, loadImage = loadImageInPage } = opts
  try {
    const response = await fetchFn(manifestUrl)
    if (!response.ok) return undefined
    const volumes = (await response.json()) as Array<{
      book?: string
      coverUrl?: string
    }>
    const cover = volumes.find((v) => v.book === '')?.coverUrl
    if (!cover) return undefined
    await loadImage(cover)
    return cover
  } catch {
    return undefined
  }
}
