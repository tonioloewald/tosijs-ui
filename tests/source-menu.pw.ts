import { test, expect } from './fixtures'

/*
#3272: a deployed site with no `projectLinks.github` offered "Edit page source", which only
alerted, and "Download source", which did nothing: there is nowhere to read the source from.
They appear only when the source can be read: a dev server's source endpoint (which the page
it serves announces) or GitHub raw.
*/
test('Edit and Download source are offered only when the source can be read', async ({
  page,
}) => {
  await page.goto('/readme/')
  await page.waitForFunction(() => (window as any).xinjsui?.createDocBrowser)
  const captions = await page.evaluate(async () => {
    const ui: any = (window as any).xinjsui
    const docs = [
      { filename: 'a.md', title: 'Alpha', path: 'a.md', text: '# Alpha' },
    ]
    const box = document.createElement('div')
    document.body.append(box)
    const menu = async (projectLinks: object) => {
      const browser = ui.createDocBrowser({
        docs,
        projectName: 'probe',
        projectLinks,
        routing: 'memory',
        initialRoute: 'a',
      })
      box.replaceChildren(browser)
      await (globalThis as any).__settled()
      return browser
        .sourceMenuItems()
        .filter(Boolean)
        .map((item: any) => item.caption)
    }
    const w = window as any
    const served = w.__tosiSourceEndpoint
    try {
      w.__tosiSourceEndpoint = false
      const deployedBare = await menu({})
      const deployedGithub = await menu({
        github: 'https://github.com/someone/project',
      })
      w.__tosiSourceEndpoint = true
      const devServer = await menu({})
      return { deployedBare, deployedGithub, devServer }
    } finally {
      w.__tosiSourceEndpoint = served
      box.remove()
    }
  })
  expect(captions).toEqual({
    deployedBare: [],
    deployedGithub: ['Edit page source', 'View on GitHub', 'Download source'],
    devServer: ['Edit page source', 'Download source'],
  })
})
