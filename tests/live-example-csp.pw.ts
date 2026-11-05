import { test, expect } from './fixtures'

/*
An example with no script of its own never constructs a function (tosijs-ui#245, #246).

The real thing, not a stub: the page is served with `script-src 'self' 'unsafe-inline'`, which
allows our scripts and inline ones but not `eval`/`Function`/`AsyncFunction`. Before the fix a
pure-HTML example built an `AsyncFunction` from its empty script, and a `run` dialect built one
before handing its source to `run`; under this policy each threw, showed an error in the
preview, and filed a violation report.

The page loads the iife and nothing else, so any violation recorded is one an example caused.
A `js` example is the control: it MUST trip the policy, or the policy is not being enforced and
this test would pass for the wrong reason.
*/
const PAGE = `<!doctype html>
<html><head>
<script>
  window.__violations = []
  document.addEventListener('securitypolicyviolation', (e) =>
    window.__violations.push(e.violatedDirective + ' ' + e.blockedURI))
</script>
</head><body>
<script src="/iife.js"></script>
</body></html>`

test('examples with no script run under a CSP without unsafe-eval', async ({
  page,
  baseURL,
}) => {
  await page.route('**/__csp-probe/', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      headers: {
        'content-security-policy': "script-src 'self' 'unsafe-inline'",
      },
      body: PAGE,
    })
  )
  await page.goto(`${baseURL}/__csp-probe/`)
  await page.waitForFunction(() => (window as any).xinjsui?.liveExample)
  // The iife's own load must not need eval, or nothing below means anything.
  expect(await page.evaluate(() => (window as any).__violations)).toEqual([])

  const result = await page.evaluate(async () => {
    const { liveExample, registerDialect } = (window as any).xinjsui
    const settle = () => (globalThis as any).__settled()
    const mount = (setup: (example: any) => void) => {
      const example = liveExample()
      example.options = { view: 'preview' }
      setup(example)
      document.body.append(example)
      return example
    }
    const errors = () => document.querySelectorAll('.preview-error').length

    mount((example) => {
      example.html = '<p class="html-only">plain markup</p>'
    })
    registerDialect('markup', {
      run: (source: string, { preview }: { preview: HTMLElement }) => {
        preview.append(
          Object.assign(document.createElement('p'), {
            className: 'ran',
            textContent: source,
          })
        )
      },
    })
    mount((example) => {
      example.dialect = 'markup'
      example.js = 'bound markup'
    })
    await settle()
    const quiet = {
      violations: [...(window as any).__violations],
      errors: errors(),
      htmlShown: !!document.querySelector('.html-only'),
      runRan: document.querySelector('.ran')?.textContent,
    }

    // The control: a script example cannot run here.
    mount((example) => {
      example.js = "preview.append('from js')"
    })
    await settle()
    return {
      quiet,
      controlViolations: (window as any).__violations.length,
    }
  })
  expect(result.quiet).toEqual({
    violations: [],
    errors: 0,
    htmlShown: true,
    runRan: 'bound markup',
  })
  expect(result.controlViolations).toBeGreaterThan(0)
})

/*
The no-code mode (tosijs-ui#246), end to end under the same policy: a page of fences under
`'no-code'`, with the host's sanitizer, hydrator and chat. Opening the code panel (CodeMirror),
choosing tabs and a chat reply all happen under the CSP, and none of it may trip it.
*/
test('no-code examples: sanitize, hydrate, tabs and chat under a CSP without unsafe-eval', async ({
  page,
  baseURL,
}) => {
  await page.route('**/__csp-no-code/', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      headers: {
        'content-security-policy': "script-src 'self' 'unsafe-inline'",
      },
      body: PAGE,
    })
  )
  await page.goto(`${baseURL}/__csp-no-code/`)
  await page.waitForFunction(() => (window as any).xinjsui?.liveExample)

  const result = await page.evaluate(async () => {
    const ui = (window as any).xinjsui
    const settle = () => (globalThis as any).__settled()
    const state: Record<string, string> = { name: 'Ada' }
    const signals: AbortSignal[] = []
    ui.setExamplePolicy('no-code')
    ui.setExampleHooks({
      sanitize: (fragment: DocumentFragment) => {
        for (const el of fragment.querySelectorAll('[onclick]'))
          el.removeAttribute('onclick')
      },
      hydrate: (preview: HTMLElement, signal: AbortSignal) => {
        signals.push(signal)
        for (const el of preview.querySelectorAll('[data-bind]'))
          el.textContent = state[el.getAttribute('data-bind')!]
      },
      chat: (session: any) => {
        const panel = document.createElement('div')
        const send = document.createElement('button')
        send.className = 'chat-send'
        send.onclick = () =>
          session.apply({
            html: '<p class="reply" data-bind="name" onclick="steal()"></p>',
          })
        panel.append(send)
        return panel
      },
    })

    const fence = (lang: string, code: string) => {
      const pre = document.createElement('pre')
      const el = document.createElement('code')
      el.className = `language-${lang}`
      el.textContent = code
      pre.append(el)
      return pre
    }
    const doc = document.createElement('div')
    doc.append(
      fence(
        'html',
        '<p class="greeting" data-bind="name" onclick="steal()"></p>'
      ),
      fence('css', '.greeting { color: rebeccapurple }'),
      fence('js', "preview.append('from js')"),
      fence('test', "test('never runs', () => {})")
    )
    document.body.append(doc)
    ui.LiveExample.insertExamples(doc)
    await settle()

    const example = doc.querySelector('tosi-example') as any
    const greeting = doc.querySelector('.greeting')
    const shown = {
      examples: doc.querySelectorAll('tosi-example').length,
      bound: greeting?.textContent,
      sanitized: !greeting?.hasAttribute('onclick'),
      codeShownAsCode: [...doc.querySelectorAll(':scope > pre code')].map(
        (code) => code.className.match(/language-(\w+)/)?.[1]
      ),
      errors: document.querySelectorAll('.preview-error').length,
    }

    example.showCode()
    await settle()
    // <tosi-tabs> makes a tab of each named body
    const tabs = example
      .querySelector('tosi-tabs')
      .bodies.map((body: Element) => body.getAttribute('name'))

    ;(example.querySelector('.chat-send') as HTMLButtonElement).click()
    await settle()
    const reply = example.querySelector('.reply')
    return {
      shown,
      tabs,
      reply: {
        bound: reply?.textContent,
        sanitized: !reply?.hasAttribute('onclick'),
        editorHasIt: example.html.includes('class="reply"'),
        previousRunAborted: signals[signals.length - 2]?.aborted,
      },
      violations: [...(window as any).__violations],
    }
  })
  expect(result.shown).toEqual({
    examples: 1,
    bound: 'Ada',
    sanitized: true,
    codeShownAsCode: ['js', 'test'],
    errors: 0,
  })
  expect(result.tabs).toEqual(['html', 'css', 'Chat'])
  expect(result.reply).toEqual({
    bound: 'Ada',
    sanitized: true,
    editorHasIt: true,
    previousRunAborted: true,
  })
  expect(result.violations).toEqual([])
})

/*
Script examples under the same policy (tosijs-ui#245): `exampleModules` gives each example a
same-origin module, and the page imports it instead of compiling. The module here is what
`exampleModuleSource` writes for a `js` example; it reaches the example the way a built page
delivers it, on the hidden bake script beside the fence.
*/
test('a script example runs from its module under a CSP without unsafe-eval; an edit says why it cannot', async ({
  page,
  baseURL,
}) => {
  const csp = { 'content-security-policy': "script-src 'self' 'unsafe-inline'" }
  await page.route('**/__csp-mod/', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      headers: csp,
      body: PAGE,
    })
  )
  await page.route('**/__csp-mod/_examples/m1.js', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      headers: csp,
      body:
        'export default async function ({ preview, console, tosijs, tosijsui }) {' +
        "const { b } = tosijs.elements\npreview.append(b({ class: 'from-module' }, 'ran'))\n}\n",
    })
  )
  await page.goto(`${baseURL}/__csp-mod/`)
  await page.waitForFunction(() => (window as any).xinjsui?.liveExample)

  const result = await page.evaluate(async () => {
    const ui = (window as any).xinjsui
    const settle = () => (globalThis as any).__settled()
    const source =
      "import { elements } from 'tosijs'\nconst { b } = elements\npreview.append(b({ class: 'from-module' }, 'ran'))"
    const doc = document.createElement('div')
    const pre = document.createElement('pre')
    const code = document.createElement('code')
    code.className = 'language-js'
    code.textContent = source
    pre.append(code)
    const bake = document.createElement('script')
    bake.type = 'application/tosi-transpiled'
    bake.setAttribute('data-dialect', 'js')
    bake.setAttribute('data-module', '/__csp-mod/_examples/m1.js')
    bake.textContent = JSON.stringify('/* the module runs, not this */')
    doc.append(pre, bake)
    document.body.append(doc)
    ui.LiveExample.insertExamples(doc, {
      tosijs: (window as any).xinjs,
      'tosijs-ui': ui,
    })
    await settle()
    const example = doc.querySelector('tosi-example') as any
    const published = {
      ran: doc.querySelector('.from-module')?.textContent,
      errors: doc.querySelectorAll('.preview-error').length,
      violations: [...(window as any).__violations],
    }
    example.js = source + '\npreview.append("edited")'
    await example.refresh()
    return {
      published,
      edited: doc.querySelector('.preview-error')?.textContent,
    }
  })
  expect(result.published).toEqual({ ran: 'ran', errors: 0, violations: [] })
  expect(result.edited).toContain('security policy (CSP)')
})
