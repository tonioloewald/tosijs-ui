import { test, expect } from 'bun:test'
import { invitePageHtml } from './invite-page.js'

const CMD = 'tosijs-tunnel --link'

test('#75: the invite screen offers a code box, not just a CLI command', () => {
  /*
  The page used to offer only a command to run on the machine hosting the server. The devices a
  tunnel exists for have no such keyboard — and an installed PWA has no address bar either,
  because iOS gives a Home Screen app its own cookie jar and its own launch URL. An
  unauthenticated launch was a black rectangle with no way out.

  This is the same affordance as the `dev.tosijs.net` landing page (pick a subdomain, type the
  code), moved to where it is needed: inside the app, where there is nowhere else to navigate.
  */
  const html = invitePageHtml('none', CMD)
  expect(html).toContain('name="t"')
  expect(html, 'submits to the same path the link uses').toContain('action="/"')
  expect(
    html,
    'the CLI route is still offered for whoever has a terminal'
  ).toContain(CMD)
})

test('#75: the input fights the phone keyboard, because the code is case-insensitive', () => {
  // Autocapitalize would offer "Abc1234" for a code the server lowercases anyway; autocorrect
  // would try to make a word of it. Both are noise on a floating keyboard.
  const html = invitePageHtml('none', CMD)
  expect(html).toContain('autocapitalize="off"')
  expect(html).toContain('autocorrect="off"')
  expect(html).toContain('spellcheck="false"')
})

test('#75: it is usable on a phone at all', () => {
  // Without a viewport meta an iOS standalone app renders it at desktop width and zooms out —
  // a code box you cannot hit is not much better than no code box.
  expect(invitePageHtml('none', CMD)).toContain('name="viewport"')
})

test('#114: a stale session says the server restarted', () => {
  const stale = invitePageHtml('stale', CMD)
  expect(stale).toContain('dev server restarted')
  expect(stale, 'and says why that is by design').toContain(
    'never written to disk'
  )
})

test('#114: an ordinary refusal does not claim a restart', () => {
  // Claiming a restart we cannot evidence would be its own lie.
  const plain = invitePageHtml('none', CMD)
  expect(plain).not.toContain('dev server restarted')
  expect(plain).toContain('invite links expire')
})

test('#75: the code box is offered in both cases', () => {
  // A stale session is exactly when someone most needs the way back in.
  for (const r of ['none', 'stale', 'unknown'] as const) {
    expect(invitePageHtml(r, CMD), r).toContain('name="t"')
  }
})
