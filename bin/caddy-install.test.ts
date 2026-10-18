import { test, expect, beforeEach, afterEach, describe } from 'bun:test'
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  chmodSync,
  statSync,
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

/*
Every test here cold-starts a real `bun` to run the bin, so its cost is interpreter startup,
not the assertion. Measured: ~1.2s each in isolation, and the file swings between 3.5s and
10.1s depending on what else the machine is doing — which put single tests past bun's 5s
default roughly one run in ten. That is a budget that does not describe the work, not a hang:
`SPAWN_TIMEOUT` is what a cold interpreter under contention actually needs. A test that
exceeds THIS is a real defect.
*/
const SPAWN_TIMEOUT = 20_000

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
      // The fake ssh runs the script with OUR environment, which a real ssh does not
      // forward: a developer with the preview keys exported would otherwise fill in what
      // preview.env leaves out.
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(
            ([k]) => !/^(PREVIEW_|ACME_EMAIL$)/.test(k)
          )
        ),
        PATH: `${bin}:${process.env.PATH}`,
      },
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

test(
  'refuses when the box has no preview.env, naming what to create',
  () => {
    // Without it there is nothing to substitute FROM, and guessing would install placeholders.
    return run().then(({ code, out }) => {
      expect(code).not.toBe(0)
      expect(out).toContain('preview.env')
      expect(existsSync(etc('Caddyfile'))).toBe(false)
    })
  },
  SPAWN_TIMEOUT
)

test(
  'refuses when a required variable is missing, naming which',
  async () => {
    writeEnv('ACME_EMAIL=me@example.com\nPREVIEW_DOMAIN=dev.example.com\n')
    const { code, out } = await run()
    expect(code).not.toBe(0)
    expect(out).toContain('PREVIEW_TOKEN')
    expect(existsSync(etc('Caddyfile'))).toBe(false)
  },
  SPAWN_TIMEOUT
)

test(
  'REGRESSION: refuses to install a template with placeholders left in it',
  async () => {
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
  },
  SPAWN_TIMEOUT
)

test(
  'a dry run changes nothing, and leaves no scratch file behind',
  async () => {
    writeEnv(FULL_ENV)
    const tpl = join(sandbox, 'Ok')
    writeFileSync(tpl, 'x.{{PREVIEW_DOMAIN}} {\n  respond "hi"\n}\n')
    const { code, out } = await run([], tpl)
    expect(code).toBe(0)
    expect(out).toContain('dry run')
    expect(existsSync(etc('Caddyfile'))).toBe(false)
    expect(existsSync(etc('Caddyfile.new'))).toBe(false)
  },
  SPAWN_TIMEOUT
)

test(
  '--go substitutes and installs',
  async () => {
    writeEnv(FULL_ENV)
    const tpl = join(sandbox, 'Ok')
    writeFileSync(
      tpl,
      'x.{{PREVIEW_DOMAIN}} {\n  respond "{{ACME_EMAIL}}"\n}\n'
    )
    const { code } = await run(['--go'], tpl)
    expect(code).toBe(0)
    const installed = readFileSync(etc('Caddyfile'), 'utf8')
    expect(installed).toContain('x.dev.example.com')
    expect(installed).toContain('me@example.com')
    expect(installed).not.toContain('{{')
    expect(existsSync(etc('Caddyfile.new'))).toBe(false)
  },
  SPAWN_TIMEOUT
)

test(
  'the invite secret is redacted from the dry-run diff',
  async () => {
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
  },
  SPAWN_TIMEOUT
)

test('the shipped template still carries the placeholders the guard looks for', () => {
  // If someone "helpfully" bakes real values into the shipped template, the guard above
  // goes quiet and the danger returns silently.
  const shipped = readFileSync(join(REPO, 'deploy/Caddyfile'), 'utf8')
  expect(shipped).toContain('{{ACME_EMAIL}}')
  expect(shipped).toContain('{{PREVIEW_DOMAIN}}')
  expect(shipped).toContain('__PREVIEW_TOKEN__')
  expect(shipped).toContain('__PREVIEW_EDIT_TOKEN__')
})

test('the shipped gate matches a key cookie exactly, not by prefix', () => {
  // Unanchored, `tosi_edit=<key>x` passed the gate (found on the maintainer's box, 1.16.26).
  const shipped = readFileSync(join(REPO, 'deploy/Caddyfile'), 'utf8')
  const gates = shipped.match(/header_regexp Cookie "[^"]*"/g) ?? []
  expect(gates.length).toBe(2)
  for (const gate of gates) {
    expect(gate).toMatch(
      /"\(\^\|; \*\)tosi_(preview|edit)=__PREVIEW_\w+__\(;\|\$\)"/
    )
  }
})

test(
  '--go keeps the outgoing config as .bak',
  () => {
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
  },
  SPAWN_TIMEOUT
)

test(
  'REGRESSION: the installed config is readable by a Caddy that does not run as root',
  async () => {
    // `umask 077` installed it root-only; Debian's Caddy runs as `caddy` and the reload
    // failed reading it (the maintainer's box, 1.16.26).
    writeEnv(FULL_ENV)
    const tpl = join(sandbox, 'Ok')
    writeFileSync(tpl, 'x.{{PREVIEW_DOMAIN}} {\n  respond "hi"\n}\n')
    const { code } = await run(['--go'], tpl)
    expect(code).toBe(0)
    expect(statSync(etc('Caddyfile')).mode & 0o040).toBe(0o040)
  },
  SPAWN_TIMEOUT
)

test(
  'REGRESSION: a refused reload puts the previous config back',
  async () => {
    // Caddy keeps serving what it loaded, so a new file it refused would only bite at the
    // next restart — taking down every site on the box, long after anyone was looking.
    writeFileSync(
      join(bin, 'systemctl'),
      '#!/bin/sh\n[ "$1" = reload ] && exit 1\nexit 0\n'
    )
    writeEnv(FULL_ENV)
    const tpl = join(sandbox, 'Ok')
    writeFileSync(tpl, 'x.{{PREVIEW_DOMAIN}} {\n  respond "hi"\n}\n')
    writeFileSync(etc('Caddyfile'), 'the previous config\n')
    const { code, out } = await run(['--go'], tpl)
    expect(code).not.toBe(0)
    expect(out).toContain('restored the previous')
    expect(readFileSync(etc('Caddyfile'), 'utf8')).toBe('the previous config\n')
  },
  SPAWN_TIMEOUT
)

test(
  'an unknown flag is refused before anything reaches the network',
  async () => {
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
  },
  SPAWN_TIMEOUT
)

describe('the global edit key', () => {
  const EDIT = 'edit-key-long-enough-to-use-1'
  const install = async (env: string) => {
    writeEnv(env)
    const tpl = join(sandbox, 'Edit')
    writeFileSync(tpl, 'gate __PREVIEW_TOKEN__ __PREVIEW_EDIT_TOKEN__\n')
    return run(['--go'], tpl)
  }

  test(
    'unset, it is filled with a value nobody knows',
    async () => {
      const { code } = await install(FULL_ENV)
      expect(code).toBe(0)
      const installed = readFileSync(etc('Caddyfile'), 'utf8')
      expect(installed).toMatch(/^gate s3cret-invite unset-[0-9a-f]{48}$/m)
    },
    SPAWN_TIMEOUT
  )

  test(
    'set, it is substituted and redacted from the dry-run diff',
    async () => {
      const { code } = await install(FULL_ENV + `PREVIEW_EDIT_TOKEN=${EDIT}\n`)
      expect(code).toBe(0)
      expect(readFileSync(etc('Caddyfile'), 'utf8')).toContain(EDIT)
      writeFileSync(etc('Caddyfile'), 'old config\n')
      const dry = await run([], join(sandbox, 'Edit'))
      expect(dry.code).toBe(0)
      expect(dry.out).not.toContain(EDIT)
    },
    SPAWN_TIMEOUT
  )

  test(
    'a short or malformed key, or the invite secret again, is refused',
    async () => {
      for (const bad of [
        'ABCDEFGH',
        'has spaces in it but is long enough',
        's3cret-invite',
      ]) {
        rmSync(etc('Caddyfile'), { force: true })
        const env =
          bad === 's3cret-invite'
            ? 'PREVIEW_TOKEN=s3cret-invite-long-enough-key\nACME_EMAIL=me@example.com\nPREVIEW_DOMAIN=dev.example.com\nPREVIEW_EDIT_TOKEN=s3cret-invite-long-enough-key\n'
            : FULL_ENV + `PREVIEW_EDIT_TOKEN="${bad}"\n`
        const { code, out } = await install(env)
        expect(code, bad).toBe(1)
        expect(out).toContain('PREVIEW_EDIT_TOKEN')
        expect(existsSync(etc('Caddyfile'))).toBe(false)
      }
    },
    SPAWN_TIMEOUT
  )
})
