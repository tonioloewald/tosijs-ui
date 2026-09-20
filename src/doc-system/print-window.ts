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
