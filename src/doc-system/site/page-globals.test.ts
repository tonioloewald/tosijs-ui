import { describe, expect, test } from 'bun:test'
import { tmpdir } from 'os'
import { pageGlobalsHead } from './page-globals.js'
import { generateSite } from './generate-site.js'

describe('pageGlobalsHead', () => {
  test("a default config stamps nothing, so a default site's HTML is unchanged", () => {
    expect(pageGlobalsHead({})).toBe('')
    expect(
      pageGlobalsHead({ liveExamples: 'auto', exampleConsole: true })
    ).toBe('')
  })

  test('exampleConsole: false stamps the global the live example reads', () => {
    expect(pageGlobalsHead({ exampleConsole: false })).toBe(
      '<script>globalThis.__TOSI_EXAMPLE_CONSOLE=false</script>'
    )
  })

  test("liveExamples: 'opt-in' stamps the policy", () => {
    expect(pageGlobalsHead({ liveExamples: 'opt-in' })).toContain(
      '__TOSI_EXAMPLE_POLICY="opt-in"'
    )
  })
})

test('the stamp lands BEFORE the bundle script, so the bundle sees it when it runs', async () => {
  const dir = `${tmpdir()}/tosi-pg-${Math.floor(performance.now() * 1000)}`
  await generateSite({
    docs: [
      {
        filename: 'README.md',
        title: 'Home',
        path: 'README.md',
        text: '# Home',
      },
    ] as any,
    outputDir: dir,
    projectName: 'T',
    headExtra: pageGlobalsHead({ exampleConsole: false }),
  } as any)
  const html = await Bun.file(`${dir}/index.html`).text()
  await Bun.$`rm -rf ${dir}`.nothrow().quiet()
  const stamp = html.indexOf('__TOSI_EXAMPLE_CONSOLE=false')
  const bundle = html.search(/<script[^>]+src="[^"]*(iife|hydrate)[^"]*\.js/)
  expect(stamp).toBeGreaterThan(-1)
  expect(bundle).toBeGreaterThan(-1)
  expect(stamp).toBeLessThan(bundle)
})

describe('dialects (#2463)', () => {
  test('declared dialects are stamped for the page to check, escaped', () => {
    expect(pageGlobalsHead({ dialects: ['ajs', 'tjs'] })).toBe(
      '<script>globalThis.__TOSI_DIALECTS=["ajs","tjs"]</script>'
    )
    expect(pageGlobalsHead({ dialects: ['</script>'] })).not.toContain(
      '</script></script>'
    )
    expect(pageGlobalsHead({ dialects: [] })).toBe('')
  })
})
