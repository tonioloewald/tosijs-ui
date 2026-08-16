import { test, expect, beforeEach, afterEach } from 'bun:test'
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  chmodSync,
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/*
The remote half of `tosijs-caddy-install`, exercised for real.

This script runs against somebody's server as root and replaces their Caddy config, so the
parts worth testing are the refusals — and none of them can be reached by unit-testing the
bin's argument parsing. Instead the test supplies its own `ssh`, which rewrites `/etc/caddy`
to a sandbox and runs the generated script locally under bash, plus stub `caddy` and
`systemctl`. That makes the actual generated shell the thing under test rather than a
paraphrase of it.
*/

let sandbox: string
let bin: string

const REPO = new URL('..', import.meta.url).pathname

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'caddy-install-'))
  mkdirSync(join(sandbox, 'etc-caddy'), { recursive: true })
  bin = join(sandbox, 'bin')
  mkdirSync(bin)

  // `ssh` that runs the piped script locally against the sandbox instead of a real box.
  writeFileSync(
    join(bin, 'ssh'),
    `#!/bin/sh\nsed "s|/etc/caddy|${join(sandbox, 'etc-caddy')}|g" | bash\n`
  )
  // `caddy fmt --overwrite F` / `caddy validate --config F` — accept anything.
  writeFileSync(join(bin, 'caddy'), '#!/bin/sh\nexit 0\n')
  writeFileSync(join(bin, 'systemctl'), '#!/bin/sh\nexit 0\n')
  for (const f of ['ssh', 'caddy', 'systemctl']) chmodSync(join(bin, f), 0o755)
})

afterEach(() => rmSync(sandbox, { recursive: true, force: true }))

const etc = (name: string) => join(sandbox, 'etc-caddy', name)

function writeEnv(contents: string) {
  writeFileSync(etc('preview.env'), contents)
}

const FULL_ENV =
  'PREVIEW_TOKEN=s3cret-invite\nACME_EMAIL=me@example.com\nPREVIEW_DOMAIN=dev.example.com\n'

async function run(args: string[] = [], templatePath?: string) {
  const proc = Bun.spawn(
    [
      'bun',
      join(REPO, 'bin/caddy-install.ts'),
      '--host=fake@box',
      ...(templatePath ? [`--template=${templatePath}`] : []),
      ...args,
    ],
    {
      cwd: REPO,
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
      stdout: 'pipe',
      stderr: 'pipe',
    }
  )
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  return { code: await proc.exited, out: stdout + stderr }
}

test('refuses when the box has no preview.env, naming what to create', () => {
  // Without it there is nothing to substitute FROM, and guessing would install placeholders.
  return run().then(({ code, out }) => {
    expect(code).not.toBe(0)
    expect(out).toContain('preview.env')
    expect(existsSync(etc('Caddyfile'))).toBe(false)
  })
})

test('refuses when a required variable is missing, naming which', async () => {
  writeEnv('ACME_EMAIL=me@example.com\nPREVIEW_DOMAIN=dev.example.com\n')
  const { code, out } = await run()
  expect(code).not.toBe(0)
  expect(out).toContain('PREVIEW_TOKEN')
  expect(existsSync(etc('Caddyfile'))).toBe(false)
})

test('REGRESSION: refuses to install a template with placeholders left in it', async () => {
  /*
  The reason this tool exists rather than a documented `sed` pipeline. Installing
  `{{ANYTHING}}` verbatim yields a preview host whose invite gate is a literal string
  published in a public repo, issuing certs under someone else's ACME account. A template
  with a placeholder nothing substitutes must FAIL, not ship.
  */
  writeEnv(FULL_ENV)
  const tpl = join(sandbox, 'Leftover')
  writeFileSync(
    tpl,
    'site {\n  email {{ACME_EMAIL}}\n  secret {{UNSUBSTITUTED}}\n}\n'
  )
  const { code, out } = await run(['--go'], tpl)
  expect(code).not.toBe(0)
  expect(out).toContain('Unsubstituted placeholders remain')
  expect(out).toContain('UNSUBSTITUTED')
  expect(existsSync(etc('Caddyfile'))).toBe(false)
})

test('a dry run changes nothing, and leaves no scratch file behind', async () => {
  writeEnv(FULL_ENV)
  const tpl = join(sandbox, 'Ok')
  writeFileSync(tpl, 'x.{{PREVIEW_DOMAIN}} {\n  respond "hi"\n}\n')
  const { code, out } = await run([], tpl)
  expect(code).toBe(0)
  expect(out).toContain('dry run')
  expect(existsSync(etc('Caddyfile'))).toBe(false)
  expect(existsSync(etc('Caddyfile.new'))).toBe(false)
})

test('--go substitutes and installs', async () => {
  writeEnv(FULL_ENV)
  const tpl = join(sandbox, 'Ok')
  writeFileSync(tpl, 'x.{{PREVIEW_DOMAIN}} {\n  respond "{{ACME_EMAIL}}"\n}\n')
  const { code } = await run(['--go'], tpl)
  expect(code).toBe(0)
  const installed = readFileSync(etc('Caddyfile'), 'utf8')
  expect(installed).toContain('x.dev.example.com')
  expect(installed).toContain('me@example.com')
  expect(installed).not.toContain('{{')
  expect(existsSync(etc('Caddyfile.new'))).toBe(false)
})

test('the invite secret is redacted from the dry-run diff', async () => {
  /*
  The diff is printed on the DEVELOPER's terminal, and scrollback is forever. The token
  never needs to be read by a human here, so it must not be shown — and it is substituted
  into the file being diffed, so this is not hypothetical.
  */
  writeEnv(FULL_ENV)
  writeFileSync(etc('Caddyfile'), 'old config\n')
  const tpl = join(sandbox, 'Tok')
  writeFileSync(tpl, 'gate __PREVIEW_TOKEN__\n')
  const { code, out } = await run([], tpl)
  expect(code).toBe(0)
  expect(out).not.toContain('s3cret-invite')
  expect(out).toContain('REDACTED')
  // …and the live config is untouched by a dry run.
  expect(readFileSync(etc('Caddyfile'), 'utf8')).toBe('old config\n')
})

test('the shipped template still carries the placeholders the guard looks for', () => {
  // If someone "helpfully" bakes real values into the shipped template, the guard above
  // goes quiet and the danger returns silently.
  const shipped = readFileSync(join(REPO, 'deploy/Caddyfile'), 'utf8')
  expect(shipped).toContain('{{ACME_EMAIL}}')
  expect(shipped).toContain('{{PREVIEW_DOMAIN}}')
  expect(shipped).toContain('__PREVIEW_TOKEN__')
})

test('--go keeps the outgoing config as .bak', () => {
  // It replaces a file that may be serving OTHER sites, and "validated" only means it
  // parses — not that it is the config you meant.
  writeEnv(FULL_ENV)
  const tpl = join(sandbox, 'Ok')
  writeFileSync(tpl, 'x.{{PREVIEW_DOMAIN}} {\n  respond "hi"\n}\n')
  writeFileSync(etc('Caddyfile'), 'the previous config\n')
  return run(['--go'], tpl).then(({ code }) => {
    expect(code).toBe(0)
    expect(readFileSync(etc('Caddyfile.bak'), 'utf8')).toBe(
      'the previous config\n'
    )
  })
})

test('an unknown flag is refused before anything reaches the network', async () => {
  /*
  `--status` was not a flag this bin parses, so it was IGNORED — and the bin went straight on
  to ssh into the configured host, whose remote script opens with an unconditional
  `cat > /etc/caddy/Caddyfile.tpl`. That turned a release lane into a writer on someone's
  real server. A tool that contacts a machine must not read an instruction it does not
  understand as consent to proceed.
  */
  writeEnv(FULL_ENV)
  const { code, out } = await run(['--status'])
  expect(code).not.toBe(0)
  expect(out).toContain('Unknown option')
  // Nothing was written, because nothing was run.
  expect(existsSync(etc('Caddyfile.tpl'))).toBe(false)
})
