#!/usr/bin/env bun
/*
tosijs-checklist: ask a person to check things an agent cannot (#4147).

The agent posts a list; whoever is looking at the dev site (on this machine, a trusted LAN
device, or over the tunnel with an edit session) sees a badge, answers each item with 👍 or 👎
and a comment, and every verdict carries a schematic of the page it was given on. `wait` blocks
until the list is answered and its exit code is the verdict, so an agent can wait on a person
the way it waits on CI.
*/
import { readFileSync } from 'fs'
import {
  checklistDirFor,
  checklistResults,
  checklistVerdict,
  clearChecklist,
  formatChecklistResults,
  normalizeChecklist,
  postChecklist,
} from '../dist/doc-system/site/checklist-store.js'
import { currentHolder } from '../dist/doc-system/site/build-lock.js'
import { parseArgv } from './resolve-site-config.ts'

const argv = process.argv.slice(2)
const { flag, has } = parseArgv(argv, {
  bin: 'tosijs-checklist',
  summary:
    'ask a person to check things on the dev site, and wait for the answers',
  flags: ['fail-fast'],
  values: ['timeout', 'dir'],
  usage:
    `  tosijs-checklist post <file.json | ->   post a list (it replaces the current one)\n` +
    `  tosijs-checklist status                 print the answers so far\n` +
    `  tosijs-checklist wait                   wait until every item is answered\n` +
    `      --timeout=SECONDS                   give up after this long (exit 2)\n` +
    `      --fail-fast                         return at the first 👎\n` +
    `  tosijs-checklist clear                  remove the list and its answers\n` +
    `  --dir=PATH                              the store (default: a per-project temp folder;\n` +
    `                                          DEV_CHECKLIST_DIR sets it for the dev server too)\n\n` +
    `A list: { "title": "…", "items": ["…", { "id": "tap", "text": "…", "url": "/menu/",\n` +
    `  "steps": ["…"] }] }, or "sections": [{ "title": "…", "items": [...] }].\n\n` +
    `wait exits 0 when every item passed, 1 when any failed, 2 on timeout or no list.`,
})

const command = argv.find((a) => !a.startsWith('--'))
const dir = checklistDirFor('.', flag('dir') ?? process.env.DEV_CHECKLIST_DIR)

if (command === 'post') {
  const source = argv.filter((a) => !a.startsWith('--'))[1]
  if (!source) {
    console.error('post needs a file, or - for stdin')
    process.exit(1)
  }
  let input: unknown
  try {
    input = JSON.parse(
      source === '-' ? await Bun.stdin.text() : readFileSync(source, 'utf8')
    )
  } catch (e) {
    console.error(`could not read ${source}: ${(e as Error).message}`)
    process.exit(1)
  }
  const list = normalizeChecklist(input)
  if ('problem' in list) {
    console.error(`not posted: ${list.problem}`)
    process.exit(1)
  }
  postChecklist(dir, list)
  const count = list.sections.reduce((n, s) => n + s.items.length, 0)
  const holder = currentHolder('.')
  console.log(
    `posted "${list.title}" (${count} ${count === 1 ? 'item' : 'items'}, id ${list.id})`
  )
  console.log(
    holder?.port
      ? `open any page of https://localhost:${holder.port}/ (or its tunnel URL): a badge shows the list`
      : 'no dev server is running for this project: start it, and any page will show the list'
  )
} else if (command === 'status') {
  console.log(formatChecklistResults(checklistResults(dir), dir))
} else if (command === 'wait') {
  const timeout = flag('timeout')
  const seconds = timeout === undefined ? Infinity : Number(timeout)
  if (!(seconds > 0)) {
    console.error('--timeout is a number of seconds')
    process.exit(1)
  }
  const deadline = Date.now() + seconds * 1000
  for (;;) {
    const results = checklistResults(dir)
    if (!results.list) {
      console.error('No checklist is posted.')
      process.exit(2)
    }
    const verdict = checklistVerdict(results, has('fail-fast'))
    if (verdict !== 'open') {
      console.log(formatChecklistResults(results, dir))
      process.exit(verdict === 'pass' ? 0 : 1)
    }
    if (Date.now() >= deadline) {
      console.log(formatChecklistResults(results, dir))
      console.error(`timed out with ${results.open} still to check`)
      process.exit(2)
    }
    await Bun.sleep(1000)
  }
} else if (command === 'clear') {
  clearChecklist(dir)
} else {
  console.error(
    command
      ? `unknown command: ${command}`
      : 'tosijs-checklist post | status | wait | clear  (--help)'
  )
  process.exit(1)
}
