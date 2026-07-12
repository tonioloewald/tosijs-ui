import { test, expect } from '@playwright/test'

// Guards the ACE → CodeMirror 6 migration (v1.7): <tosi-code> must render CM in
// its shadow root, honor the value get/set contract, edit via the keyboard, and
// undo/redo through the new methods (which replaced reaching into the raw editor).
//
// Requires the dev server (https://localhost:8787). The Playwright config does not
// start it; run `bun start` first.

test('tosi-code (CodeMirror) renders, honors value, edits, and undoes', async ({
  page,
}) => {
  await page.goto('https://localhost:8787/')
  await page.waitForFunction(() => !!customElements.get('tosi-code'))

  await page.evaluate(() => {
    const el = document.createElement('tosi-code') as any
    el.id = 'repro'
    el.setAttribute('mode', 'javascript')
    el.style.cssText = 'width: 420px; height: 200px; display: block'
    el.textContent = 'const a = 1'
    document.body.appendChild(el)
  })

  // CodeMirror is a lazy chunk — wait for it to mount into the shadow root.
  await page.waitForFunction(
    () => {
      const el = document.getElementById('repro') as any
      return !!el?.shadowRoot?.querySelector('.cm-editor')
    },
    { timeout: 8000 }
  )

  // Renders CM chrome, and `value` reflects the initial textContent.
  const initial = await page.evaluate(() => {
    const el = document.getElementById('repro') as any
    return {
      value: el.value,
      hasGutter: !!el.shadowRoot.querySelector('.cm-gutters'),
      content: el.shadowRoot.querySelector('.cm-content')?.textContent ?? '',
    }
  })
  expect(initial.value).toBe('const a = 1')
  expect(initial.hasGutter).toBe(true)
  expect(initial.content).toContain('const a = 1')

  // Setting `value` updates the rendered document.
  await page.evaluate(() => {
    ;(document.getElementById('repro') as any).value = 'let b = 2'
  })
  await page.waitForFunction(() => {
    const el = document.getElementById('repro') as any
    return (
      el.value === 'let b = 2' &&
      (el.shadowRoot.querySelector('.cm-content')?.textContent ?? '').includes(
        'let b = 2'
      )
    )
  })

  // Typing through the editor updates `value`.
  await page.evaluate(() => (document.getElementById('repro') as any).editor.focus())
  await page.keyboard.type(' + 3')
  await page.waitForFunction(() =>
    (document.getElementById('repro') as any).value.includes('+ 3')
  )
  expect(
    await page.evaluate(() => (document.getElementById('repro') as any).canUndo())
  ).toBe(true)

  // undo() reverts the typed edit and enables redo(); redo() re-applies it. (CM
  // may group the value-set and the typing into one history step, so assert on the
  // typed text's presence rather than an exact intermediate document.)
  await page.evaluate(() => (document.getElementById('repro') as any).undo())
  await page.waitForFunction(
    () => !(document.getElementById('repro') as any).value.includes('+ 3')
  )
  expect(
    await page.evaluate(() => (document.getElementById('repro') as any).canRedo())
  ).toBe(true)

  await page.evaluate(() => (document.getElementById('repro') as any).redo())
  await page.waitForFunction(() =>
    (document.getElementById('repro') as any).value.includes('+ 3')
  )

  await page.evaluate(() => document.getElementById('repro')?.remove())
})

test('tosi-code respects the disabled (read-only) attribute', async ({ page }) => {
  await page.goto('https://localhost:8787/')
  await page.waitForFunction(() => !!customElements.get('tosi-code'))

  await page.evaluate(() => {
    const el = document.createElement('tosi-code') as any
    el.id = 'ro'
    el.setAttribute('disabled', '')
    el.style.cssText = 'width: 420px; height: 160px; display: block'
    el.textContent = 'read only'
    document.body.appendChild(el)
  })

  await page.waitForFunction(
    () => !!(document.getElementById('ro') as any)?.shadowRoot?.querySelector('.cm-editor'),
    { timeout: 8000 }
  )

  // EditorState.readOnly keeps the content focusable (contenteditable stays true)
  // but the state reports read-only and edits are rejected.
  expect(
    await page.evaluate(
      () => (document.getElementById('ro') as any).editor.state.readOnly
    )
  ).toBe(true)

  // Typing into a read-only editor must not change the value.
  const before = await page.evaluate(
    () => (document.getElementById('ro') as any).value
  )
  await page.evaluate(() => (document.getElementById('ro') as any).editor.focus())
  await page.keyboard.type('XYZ')
  await page.waitForTimeout(150)
  expect(
    await page.evaluate(() => (document.getElementById('ro') as any).value)
  ).toBe(before)

  await page.evaluate(() => document.getElementById('ro')?.remove())
})

// Regression for the v1.7 `showDiff()` blank-overlay bug: giving <tosi-code> its own
// `content` displaced tosijs's default `slot()`, so the diff overlay — appended to the
// LIGHT DOM, as it was under Ace (which mounted there) — was projected by nothing and
// rendered at 0x0 while `showingDiff` still reported true. A state-only assertion passes
// against that bug, so this asserts the overlay is ACTUALLY PAINTED.
//
// This surface is load-bearing: it is the review step of the doc-system's
// edit-and-save-to-source flow (and of AI-proposed edits) — a silently-blank diff means
// blind-saving changes you never saw.
test('tosi-code showDiff() actually renders the diff overlay', async ({ page }) => {
  await page.goto('https://localhost:8787/')
  await page.waitForFunction(() => !!customElements.get('tosi-code'))

  await page.evaluate(() => {
    const el = document.createElement('tosi-code') as any
    el.id = 'diff'
    el.style.cssText = 'width: 600px; height: 300px; display: block'
    el.textContent = 'const a = 1'
    document.body.appendChild(el)
  })
  await page.waitForFunction(
    () => !!(document.getElementById('diff') as any)?.shadowRoot?.querySelector('.cm-editor'),
    { timeout: 8000 }
  )

  await page.evaluate(() => {
    const el = document.getElementById('diff') as any
    el.original = 'const a = 1'
    el.value = 'const a = 2\nconst b = 3'
    el.showDiff(true)
  })

  // tosi-diff paints on a queued (rAF) render, so wait for the paint rather than
  // measuring synchronously — but assert on real geometry, not on state.
  await page.waitForFunction(
    () => {
      const overlay = (
        document.getElementById('diff') as any
      )?.shadowRoot?.querySelector('tosi-diff')
      return !!overlay && overlay.getBoundingClientRect().height > 0
    },
    { timeout: 5000 }
  )

  const shown = await page.evaluate(() => {
    const el = document.getElementById('diff') as any
    const overlay = el.shadowRoot.querySelector('tosi-diff') as HTMLElement | null
    const r = overlay?.getBoundingClientRect()
    return {
      showingDiff: el.showingDiff,
      inShadow: !!overlay,
      visible: overlay ? overlay.checkVisibility() : false,
      width: r ? Math.round(r.width) : 0,
      height: r ? Math.round(r.height) : 0,
      // the rendered diff must actually contain the changed lines
      lines: overlay?.shadowRoot?.querySelectorAll('.diff-line').length ?? 0,
    }
  })

  expect(shown.inShadow).toBe(true)
  expect(shown.showingDiff).toBe(true)
  expect(shown.visible).toBe(true)
  // The bug rendered a 0x0 element — require real painted area.
  expect(shown.width).toBeGreaterThan(0)
  expect(shown.height).toBeGreaterThan(0)

  // …and toggling it off hides it again (without destroying it).
  const hidden = await page.evaluate(() => {
    const el = document.getElementById('diff') as any
    el.showDiff(false)
    const overlay = el.shadowRoot.querySelector('tosi-diff') as HTMLElement | null
    return { showingDiff: el.showingDiff, visible: overlay ? overlay.checkVisibility() : false }
  })
  expect(hidden.showingDiff).toBe(false)
  expect(hidden.visible).toBe(false)

  await page.evaluate(() => document.getElementById('diff')?.remove())
})
