import { test, expect } from './fixtures'
import { spawn, type ChildProcess } from 'child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'fs'
import { createServer } from 'net'
import { tmpdir } from 'os'
import * as path from 'path'

/*
`devServer()` builds once on start (#3524). The documented one-liner, `… : devServer(config)`,
used to serve whatever the previous run left in the output dir, so a config change showed
nothing until a watched file changed. `initialBuild: false` is for a caller that has just
built (`bin/dev.ts`). A server of its own in a throwaway project, with a `build` that only
leaves a mark; Chromium only, since what is under test is the server.
*/

const REPO = path.resolve('.')

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, () => {
      const { port } = probe.address() as { port: number }
      probe.close(() => resolve(port))
    })
  })

const startServer = async (
  dir: string,
  extra: string
): Promise<ChildProcess> => {
  const marker = path.join(dir, 'built.txt')
  const server = spawn(
    'bun',
    [
      '-e',
      `
      import { writeFileSync } from 'fs'
      import { devServer } from ${JSON.stringify(
        path.join(REPO, 'src/doc-system/site/index.ts')
      )}
      await devServer(
        { name: 'Initial Build', outputDir: 'docs', audit: false, docPaths: ['pages'] },
        { build: () => writeFileSync(${JSON.stringify(
          marker
        )}, 'built')${extra} }
      )
      `,
    ],
    {
      cwd: dir,
      env: {
        ...process.env,
        PORT: String(await freePort()),
        DEV_SKIP_PREFLIGHT: '1',
        DEV_NO_TUNNEL: '1',
        HALTIJA_DEV: '0',
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
    server.stdout!.on('data', listen)
    server.stderr!.on('data', listen)
    server.once('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`dev server exited ${code}:\n${output}`))
    })
  })
  return server
}

const project = () => {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'tosijs-initial-')))
  mkdirSync(path.join(dir, 'docs'))
  mkdirSync(path.join(dir, 'pages'))
  writeFileSync(path.join(dir, 'docs/index.html'), '<!doctype html><p>old')
  writeFileSync(path.join(dir, 'pages/a.md'), '# A')
  writeFileSync(path.join(dir, 'package.json'), '{"name":"initial-build"}\n')
  symlinkSync(path.join(REPO, 'tls'), path.join(dir, 'tls'))
  return dir
}

test('devServer builds once on start, unless told it already has', async ({
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'one server is enough to test a server')
  test.setTimeout(150_000)
  const built = project()
  const skipped = project()
  const servers: ChildProcess[] = []
  try {
    servers.push(await startServer(built, ''))
    await expect
      .poll(() => existsSync(path.join(built, 'built.txt')), {
        timeout: 30_000,
      })
      .toBe(true)

    servers.push(await startServer(skipped, ', initialBuild: false'))
    // The first server's build landed within a second of binding; give this one longer.
    await new Promise((resolve) => setTimeout(resolve, 3000))
    expect(existsSync(path.join(skipped, 'built.txt'))).toBe(false)
  } finally {
    servers.forEach((server) => server.kill('SIGTERM'))
    rmSync(built, { recursive: true, force: true })
    rmSync(skipped, { recursive: true, force: true })
  }
})
