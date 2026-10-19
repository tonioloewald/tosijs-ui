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
  fakeSystemctl()
  for (const f of ['ssh', 'caddy', 'systemctl']) chmodSync(join(bin, f), 0o755)
})

afterEach(() => rmSync(sandbox, { recursive: true, force: true }))

const etc = (name: string) => join(sandbox, 'etc-caddy', name)

/**
 * `systemctl` as the installer sees it: who Caddy runs as (`show -p User|Group --value`),
 * whether it is up (`is-active`), and which of `reload`/`start` fails. By default Caddy runs as
 * root (no group) and is up.
 */
function fakeSystemctl(
  opts: {
    user?: string
    group?: string
    active?: boolean
    fail?: 'reload' | 'start'
  } = {}
) {
  writeFileSync(
    join(bin, 'systemctl'),
    `#!/bin/sh
case "$1" in
  show) [ "$3" = User ] && echo '${
    opts.user ?? ''
  }'; [ "$3" = Group ] && echo '${opts.group ?? ''}'; exit 0 ;;
  is-active) exit ${opts.active === false ? 3 : 0} ;;
  ${opts.fail ?? 'never'}) exit 1 ;;
esac
exit 0
`
  )
  chmodSync(join(bin, 'systemctl'), 0o755)
}

// A group and user this process may chgrp to, standing in for `caddy`.
const MY_GROUP = Bun.spawnSync(['id', '-gn']).stdout.toString().trim()
const MY_USER = Bun.spawnSync(['id', '-un']).stdout.toString().trim()

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

const OK_TEMPLATE = 'x.{{PREVIEW_DOMAIN}} {\n  respond "hi"\n}\n'

async function installOver(previous?: { text: string; mode: number }) {
  writeEnv(FULL_ENV)
  const tpl = join(sandbox, 'Ok')
  writeFileSync(tpl, OK_TEMPLATE)
  if (previous) {
    writeFileSync(etc('Caddyfile'), previous.text)
    chmodSync(etc('Caddyfile'), previous.mode)
  }
  return run(['--go'], tpl)
}

const modeOf = (name: string) => statSync(etc(name)).mode & 0o777

describe('who can read the installed config', () => {
  /*
  It holds both keys, so nobody but Caddy. \`umask 077\` installed it root-only, Debian's Caddy
  runs as \`caddy\`, and the reload failed reading it (the maintainer's box, 1.16.26).
  */
  test(
    'REGRESSION: the group Caddy runs as, and nobody else',
    async () => {
      fakeSystemctl({ user: 'caddy', group: MY_GROUP })
      const { code } = await installOver()
      expect(code).toBe(0)
      expect(modeOf('Caddyfile')).toBe(0o640)
      expect(statSync(etc('Caddyfile')).gid).toBe(process.getgid!())
    },
    SPAWN_TIMEOUT
  )

  test(
    "with no Group= in the unit, the Caddy user's own group",
    async () => {
      fakeSystemctl({ user: MY_USER })
      const { code } = await installOver()
      expect(code).toBe(0)
      expect(modeOf('Caddyfile')).toBe(0o640)
      expect(statSync(etc('Caddyfile')).gid).toBe(process.getgid!())
    },
    SPAWN_TIMEOUT
  )

  test(
    'a Caddy run as root gets a root-only file, never a world-readable one',
    async () => {
      fakeSystemctl()
      const { code } = await installOver()
      expect(code).toBe(0)
      expect(modeOf('Caddyfile')).toBe(0o600)
    },
    SPAWN_TIMEOUT
  )
})

describe('when Caddy will not take the new config', () => {
  test(
    'REGRESSION: a refused reload puts the previous config back, readable by Caddy',
    async () => {
      // Caddy keeps serving what it loaded, so a new file it refused would only bite at the
      // next restart, taking down every site on the box long after anyone was looking. The
      // previous file may be one 1.16.26 left root-only: restore its CONTENT, not its mode.
      fakeSystemctl({ group: MY_GROUP, fail: 'reload' })
      const { code, out } = await installOver({
        text: 'the previous config\n',
        mode: 0o600,
      })
      expect(code).not.toBe(0)
      expect(out).toContain('refused to reload')
      expect(out).toContain('restored the previous')
      expect(readFileSync(etc('Caddyfile'), 'utf8')).toBe(
        'the previous config\n'
      )
      expect(modeOf('Caddyfile')).toBe(0o640)
    },
    SPAWN_TIMEOUT
  )

  test(
    'REGRESSION: a stopped Caddy is started with the new config, not rolled back',
    async () => {
      // A stopped unit cannot reload. Treating that as a refusal restored the broken
      // root-only file on exactly the boxes this release exists to repair.
      fakeSystemctl({ group: MY_GROUP, active: false, fail: 'reload' })
      const { code, out } = await installOver({
        text: 'the previous config\n',
        mode: 0o600,
      })
      expect(code).toBe(0)
      expect(out).toContain('caddy: start')
      expect(readFileSync(etc('Caddyfile'), 'utf8')).toContain('respond "hi"')
      expect(modeOf('Caddyfile')).toBe(0o640)
    },
    SPAWN_TIMEOUT
  )

  test(
    'a stopped Caddy that will not start says it is not running',
    async () => {
      fakeSystemctl({ group: MY_GROUP, active: false, fail: 'start' })
      const { code, out } = await installOver({
        text: 'the previous config\n',
        mode: 0o644,
      })
      expect(code).not.toBe(0)
      expect(out).toContain('caddy is not running')
      expect(readFileSync(etc('Caddyfile'), 'utf8')).toBe(
        'the previous config\n'
      )
    },
    SPAWN_TIMEOUT
  )
})

test(
  'refuses an invite secret the gate regex or sed would misread',
  async () => {
    writeEnv(
      'PREVIEW_TOKEN=a.b+c-long-enough-to-be-a-key\nACME_EMAIL=me@example.com\nPREVIEW_DOMAIN=dev.example.com\n'
    )
    const tpl = join(sandbox, 'Ok')
    writeFileSync(tpl, OK_TEMPLATE)
    const { code, out } = await run(['--go'], tpl)
    expect(code).not.toBe(0)
    expect(out).toContain('PREVIEW_TOKEN may contain only')
    expect(existsSync(etc('Caddyfile'))).toBe(false)
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

test('a key link redirects only to a host under the preview domain', () => {
  // `&to=<label>` lets `tosijs-tunnel` hand out one link that sets the key at the domain's
  // root and opens its workspace. The target is built from DNS labels and always ends in
  // the preview domain, so the link cannot be turned into an off-site redirect. Checked
  // against real Caddy (2.6.2 on the box, 2.11.7 locally): `evil.com/x`, CR/LF, `a..b`, a
  // repeated `to` all fall back to `/`.
  const shipped = readFileSync(join(REPO, 'deploy/Caddyfile'), 'utf8')
  const map = shipped.match(
    /map \{query\.to\} \{tosi_link_target\} \{\n([\s\S]*?)\n\t\}/
  )
  expect(map).not.toBeNull()
  const [pattern, target] = map![1].trim().split(/\s+/)
  expect(target).toBe('"https://${1}.{{PREVIEW_DOMAIN}}/"')
  const labels = new RegExp(pattern.slice(1))
  for (const ok of ['ui', 'ui.edit', 'a-1.b'])
    expect(labels.test(ok)).toBe(true)
  for (const bad of [
    'evil.com/x',
    'a..b',
    '.ui',
    'ui.',
    '-a',
    'UI',
    'a\r\nb',
    'a,b',
  ])
    expect(labels.test(bad)).toBe(false)
  expect(map![1]).toContain('default "/"')
  // Both key links land through it, and nothing else redirects to a fixed root.
  expect(shipped.match(/redir \* \{tosi_link_target\} 302/g)?.length).toBe(2)
  expect(shipped).not.toContain('redir * / 302')
})

test('the access logs never record a link credential', () => {
  // `t` carries a global key or a single-use code, `token` a link code. Caddy keeps cookies
  // out of its log already; the box's log held keys from every `?t=` visit until 1.16.28.
  const shipped = readFileSync(join(REPO, 'deploy/Caddyfile'), 'utf8')
  const logs = shipped.match(/\n\tlog \{[\s\S]*?\n\t\}/g) ?? []
  expect(logs.length).toBe(2)
  for (const log of logs) {
    expect(log).toContain('format filter {')
    expect(log).toMatch(
      /request>uri query \{\s*replace t REDACTED\s*replace token REDACTED\s*\}/
    )
  }
})
