import { test, expect, describe } from 'bun:test'
import { parseArgv, type ArgvSpec } from './resolve-site-config'

/*
The bins' argv parser (#85).

`parseArgv` exits the process on `--help` and on an unrecognised flag, so every test here
stubs `process.exit` and the console. The stub THROWS rather than returning, because the real
`process.exit` never returns: a stub that returns would let execution fall through into code
the real bin would never reach, and the test would be asserting on a state that cannot exist.
*/
function run(args: string[], spec: Partial<ArgvSpec> = {}) {
  const full: ArgvSpec = {
    bin: 'tosijs-thing',
    summary: 'do the thing',
    flags: ['go'],
    values: ['host'],
    usage: '  tosijs-thing --go',
    ...spec,
  }
  const out: string[] = []
  const realExit = process.exit
  const realLog = console.log
  const realErr = console.error
  let code: number | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.exit = ((c?: number) => {
    code = c
    throw new Error('__exit__')
  }) as any
  console.log = (m?: unknown) => void out.push(String(m))
  console.error = (m?: unknown) => void out.push(String(m))
  try {
    const parsed = parseArgv(args, full)
    return { exited: false as const, code, out: out.join('\n'), argv: parsed }
  } catch (e) {
    if ((e as Error).message !== '__exit__') throw e
    return { exited: true as const, code, out: out.join('\n'), argv: null }
  } finally {
    process.exit = realExit
    console.log = realLog
    console.error = realErr
  }
}

describe('parseArgv', () => {
  test('an unrecognised flag exits 1 and names it', () => {
    const r = run(['--status'])
    expect(r.exited).toBe(true)
    expect(r.code).toBe(1)
    expect(r.out).toContain('--status')
    expect(r.out).toContain('Unknown option')
  })

  test('--help exits 0 and prints the usage', () => {
    const r = run(['--help'])
    expect(r.exited).toBe(true)
    expect(r.code).toBe(0)
    expect(r.out).toContain('tosijs-thing')
    expect(r.out).toContain('do the thing')
    expect(r.out).not.toContain('Unknown option')
  })

  test('known flags and values parse, and do not exit', () => {
    const r = run(['--go', '--host=user@box', 'extra'])
    expect(r.exited).toBe(false)
    expect(r.argv!.has('go')).toBe(true)
    expect(r.argv!.has('nope')).toBe(false)
    expect(r.argv!.flag('host')).toBe('user@box')
    expect(r.argv!.flag('missing')).toBe(undefined)
    expect(r.argv!.rest).toEqual(['extra'])
  })

  test('a value flag passed bare, or a bare flag given a value, is unknown', () => {
    // `--host` declared as a VALUE flag is not a boolean one…
    expect(run(['--host']).code).toBe(1)
    // …and `--go` declared as boolean does not take a value.
    expect(run(['--go=yes']).code).toBe(1)
  })

  test('no arguments is not an error', () => {
    const r = run([])
    expect(r.exited).toBe(false)
    expect(r.argv!.has('go')).toBe(false)
  })

  /*
  The case the issue exists for: `tosijs-caddy-install --status` was ignored, read as "no
  flags at all", and the bin went on to ssh into the configured host. Refusing has to happen
  before anything reaches the network.
  */
  test('#85: an unknown flag is refused rather than ignored', () => {
    const r = run(['--status', '--go'])
    expect(r.exited).toBe(true)
    expect(r.code).toBe(1)
  })
})
