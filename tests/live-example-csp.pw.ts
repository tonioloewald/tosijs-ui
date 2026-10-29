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
    const settle = () => new Promise((resolve) => setTimeout(resolve, 300))
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
