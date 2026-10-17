import { test, expect } from './fixtures'
import { spawn, execFileSync, type ChildProcess } from 'child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'fs'
import { createServer } from 'net'
import { tmpdir } from 'os'
import * as path from 'path'

/*
A dev server of its own, in a throwaway project, for what the shared server on 8799 cannot
show because this repo's config does not turn it on:

- a `home` site through the dev server's SPA fallback (#3346): a path with no file of its own
  is answered with the root page, which under `home` is the HOME doc's pre-render, so
  hydration has to show the doc the URL names instead;
- `editableData` (#3365), end to end through the real gate and route, with commit-per-save.

The project is a git repository so saves can be committed. One server for the file, so the
tests run serially in one worker; Chromium only, since what is under test is the server.
*/

test.describe.configure({ mode: 'serial' })

const REPO = path.resolve('.')
let dir = ''
let origin = ''
let server: ChildProcess | undefined

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, () => {
      const { port } = probe.address() as { port: number }
      probe.close(() => resolve(port))
    })
  })

const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: dir, stdio: 'pipe' }).toString()

test.beforeAll(async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'one server is enough to test a server')
  test.setTimeout(120_000)
  dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'tosijs-project-')))
  execFileSync(
    'bun',
    [
      '-e',
      `
      import { generateSite } from ${JSON.stringify(
        path.join(REPO, 'src/doc-system/site/generate-site.ts')
      )}
      await generateSite({
        docs: [
          { filename: 'README.md', title: 'Read me', path: 'README.md', text: '# Read me\\n\\nThe readme page.' },
          { filename: 'app.md', title: 'The App', path: 'app.md', home: true, text: '# The App\\n\\nThe home page.' },
          { filename: 'guide.md', title: 'Guide', path: 'guide.md', text: '# Guide\\n\\nThe guide page.' },
        ],
        outputDir: ${JSON.stringify(path.join(dir, 'docs'))},
        projectName: 'Project Test',
      })
      `,
    ],
    { stdio: 'pipe' }
  )
  copyFileSync(path.join(REPO, 'dist/iife.js'), path.join(dir, 'docs/iife.js'))
  // The guide has no file of its own now, so the SPA fallback answers for it.
  rmSync(path.join(dir, 'docs/guide'), { recursive: true })
  symlinkSync(path.join(REPO, 'tls'), path.join(dir, 'tls'))
  mkdirSync(path.join(dir, 'static/levels'), { recursive: true })
  writeFileSync(
    path.join(dir, 'static/levels/ocean.json'),
    '{"name":"ocean"}\n'
  )
  writeFileSync(path.join(dir, 'package.json'), '{"name":"project-test"}\n')
  writeFileSync(path.join(dir, '.gitignore'), 'docs/\ntls\n')
  git('init', '-q')
  git('config', 'user.email', 'test@example.com')
  git('config', 'user.name', 'Test')
  git('config', 'commit.gpgsign', 'false')
  git('add', '.')
  git('commit', '-qm', 'start')

  const port = await freePort()
  origin = `https://localhost:${port}`
  const config = {
    name: 'Project Test',
    outputDir: 'docs',
    audit: false,
    editableData: { dirs: ['static/levels'], commit: true },
  }
  server = spawn(
    'bun',
    [
      '-e',
      `
      import { devServer } from ${JSON.stringify(
        path.join(REPO, 'src/doc-system/site/index.ts')
      )}
      await devServer(${JSON.stringify(config)}, { build: () => {} })
      `,
    ],
    {
      cwd: dir,
      env: {
        ...process.env,
        PORT: String(port),
        DEV_SKIP_PREFLIGHT: '1',
        DEV_NO_TUNNEL: '1',
        DEV_NO_WATCH: '1',
        HALTIJA_DEV: '0',
        TOSIJS_TRUST_LAN: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )
  let output = ''
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`dev server did not start:\n${output}`)),
      60_000
    )
    const listen = (chunk: Buffer) => {
      output += chunk
      if (output.includes('Listening on')) {
        clearTimeout(timer)
        resolve()
      }
    }
    server!.stdout!.on('data', listen)
    server!.stderr!.on('data', listen)
    server!.once('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`dev server exited ${code}:\n${output}`))
    })
  })
})

test.afterAll(() => {
  server?.kill('SIGTERM')
  if (dir) rmSync(dir, { recursive: true, force: true })
})

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
})

const heading = (page: any) =>
  page.locator('.doc-content h1').first().textContent()

test('home: a path with no file of its own hydrates into the doc it names', async ({
  page,
}) => {
  const fallback = await page.request.get(`${origin}/guide/`)
  expect(fallback.status()).toBe(200)
  // The server answered with the root page, the home doc's pre-render...
  expect(await fallback.text()).toContain('The home page.')
  // ...and the reader sees the guide.
  await page.goto(`${origin}/guide/`)
  await expect.poll(() => heading(page), { timeout: 15_000 }).toBe('Guide')
  // The root is still the home doc, and README still has /readme/.
  await page.goto(`${origin}/`)
  await expect.poll(() => heading(page), { timeout: 15_000 }).toBe('The App')
  await page.goto(`${origin}/readme/`)
  await expect.poll(() => heading(page), { timeout: 15_000 }).toBe('Read me')
})

test('home: query and memory routing start at the home doc too', async ({
  page,
}) => {
  // A filename the host page's own corpus lacks: the host rewrites a legacy `?README.md`
  // to /readme/ before anything else on the page can read it.
  await page.goto(`${origin}/readme/?notes.md`)
  await page.waitForFunction(() => (window as any).xinjsui?.createDocBrowser)
  const shown = await page.evaluate(async () => {
    const ui: any = (window as any).xinjsui
    const docs = [
      {
        filename: 'README.md',
        title: 'Read me',
        path: 'README.md',
        text: '# Read me',
      },
      {
        filename: 'app.md',
        title: 'The App',
        path: 'app.md',
        home: true,
        text: '# The App',
      },
      {
        filename: 'notes.md',
        title: 'Notes',
        path: 'notes.md',
        text: '# Notes',
      },
    ]
    const settle = () => new Promise((resolve) => setTimeout(resolve, 600))
    const h1 = (el: Element) => el.querySelector('.doc-content h1')?.textContent
    const mount = (options: object) => {
      const box = document.createElement('div')
      document.body.append(box)
      const browser = ui.createDocBrowser({
        docs,
        projectName: 'probe',
        ...options,
      })
      box.append(browser)
      return browser
    }
    const routes: string[] = []
    const memory = mount({
      routing: 'memory',
      onRouteChange: (slug: string) => routes.push(slug),
    })
    await settle()
    const memoryStart = h1(memory)
    // A reader's click is reported to the host...
    ;[...memory.querySelectorAll('a.doc-link')]
      .find((a: any) => a.textContent.trim() === 'Read me')
      ?.click()
    await settle()
    const memoryReadme = h1(memory)
    // ...and the host's own navigate() is not echoed back to it.
    memory.navigate('')
    await settle()
    const memoryHome = h1(memory)
    const location = window.location.href
    // Query routing reads `?notes.md` from this page's URL.
    const query = mount({ routing: 'query' })
    await settle()
    return {
      memoryStart,
      memoryReadme,
      memoryHome,
      routes,
      memoryLeftUrlAlone: location === window.location.href,
      query: h1(query),
    }
  })
  expect(shown).toEqual({
    memoryStart: 'The App',
    memoryReadme: 'Read me',
    memoryHome: 'The App',
    routes: ['readme'],
    memoryLeftUrlAlone: true,
    query: 'Notes',
  })
})

test('query routing with no query string shows the home doc', async ({
  page,
}) => {
  await page.goto(`${origin}/readme/`)
  await page.waitForFunction(() => (window as any).xinjsui?.createDocBrowser)
  const h1 = await page.evaluate(async () => {
    const ui: any = (window as any).xinjsui
    const browser = ui.createDocBrowser({
      docs: [
        {
          filename: 'README.md',
          title: 'Read me',
          path: 'README.md',
          text: '# Read me',
        },
        {
          filename: 'app.md',
          title: 'The App',
          path: 'app.md',
          home: true,
          text: '# The App',
        },
      ],
      routing: 'query',
      projectName: 'probe',
    })
    document.body.append(browser)
    await new Promise((resolve) => setTimeout(resolve, 600))
    return browser.querySelector('.doc-content h1')?.textContent
  })
  expect(h1).toBe('The App')
})

test('editableData: list, save, commit, history and an old version, from the page', async ({
  page,
}) => {
  await page.goto(`${origin}/`)
  // From the page, so the request carries the browser's own Origin, as an editor's would.
  const result = await page.evaluate(async () => {
    const call = async (query: string, init?: RequestInit) => {
      const r = await fetch(`/__docstore/data${query}`, init)
      return { status: r.status, body: await r.text() }
    }
    const save = (file: string, content: string) =>
      call('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, content }),
      })
    const list = await call('?list')
    const saved = await save('static/levels/ocean.json', '{"name":"abyss"}\n')
    const created = await save('static/levels/reef.json', '{"name":"reef"}\n')
    const history = await call('?history=static/levels/ocean.json')
    const versions = JSON.parse(history.body).versions
    const old = await call(
      `?file=static/levels/ocean.json&at=${versions[1].commit}`
    )
    const now = await call('?file=static/levels/ocean.json')
    return {
      list: JSON.parse(list.body).files.map((f: any) => f.file),
      saved: JSON.parse(saved.body),
      created: created.status,
      subjects: versions.map((v: any) => v.subject),
      old: old.body,
      now: now.body,
      refusals: {
        config: (await save('static/levels/package.json', '{}')).status,
        outside: (await save('package.json', '{}')).status,
        script: (await save('static/levels/x.js', '1')).status,
        badJson: (await save('static/levels/ocean.json', '{"name":')).status,
        traversal: (await call('?file=static/levels/../../package.json'))
          .status,
      },
    }
  })
  expect(result.list).toEqual(['static/levels/ocean.json'])
  expect(result.saved).toMatchObject({
    ok: true,
    file: 'static/levels/ocean.json',
  })
  expect(result.saved.commit).toMatch(/^[0-9a-f]{40}$/)
  expect(result.created).toBe(200)
  expect(result.subjects).toEqual([
    'data: save static/levels/ocean.json',
    'start',
  ])
  expect(result.old).toBe('{"name":"ocean"}\n')
  expect(result.now).toBe('{"name":"abyss"}\n')
  expect(result.refusals).toEqual({
    config: 403,
    outside: 403,
    script: 403,
    badJson: 400,
    traversal: 403,
  })
  // On disk and in git, and nothing else was committed.
  expect(readFileSync(path.join(dir, 'static/levels/reef.json'), 'utf8')).toBe(
    '{"name":"reef"}\n'
  )
  expect(git('log', '--format=%s').trim().split('\n')).toEqual([
    'data: save static/levels/reef.json',
    'data: save static/levels/ocean.json',
    'start',
  ])
  expect(git('status', '--porcelain').trim()).toBe('')
})

test('editableData: a page on another site cannot write through this browser', async ({
  page,
}) => {
  const response = await page.request.post(`${origin}/__docstore/data`, {
    headers: {
      Origin: 'https://evil.test',
      'Content-Type': 'application/json',
    },
    data: JSON.stringify({ file: 'static/levels/ocean.json', content: '{}' }),
  })
  expect(response.status()).toBe(403)
  expect(
    readFileSync(path.join(dir, 'static/levels/ocean.json'), 'utf8')
  ).not.toBe('{}')
})

test('without editableData the endpoint says so, and never serves the page', async ({
  page,
}) => {
  // The shared server's config (this repo's) does not set editableData.
  const response = await page.request.get('/__docstore/data?list')
  expect(response.status()).toBe(501)
  expect(await response.text()).toContain('editableData')
})
