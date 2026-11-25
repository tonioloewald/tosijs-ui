import { test, expect } from 'bun:test'
import { Glob } from 'bun'
import { readFileSync } from 'fs'
import { Component } from 'tosijs'

/*
No component may define a member named `on<Event>` (`onCloseTab`, `onCancel`): tosijs's
elements factory reads that name as event-handler sugar, so `creator({ onCancel })` attaches
a listener instead of setting the member, and tosijs warns once per class, in every adopter's
console. Name a callback `handle<Event>`.

tosijs only warns once per class per session, so this reads the members itself, with the
same rule. The classes come from every source file that makes an element creator, so a new
component is covered without being listed here.
*/
const ON_EVENT = /^on[A-Z]/

function onEventMembers(instance: object): string[] {
  const names = new Set(Object.keys(instance).filter((k) => ON_EVENT.test(k)))
  let proto = Object.getPrototypeOf(instance)
  while (proto && proto !== Component.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (ON_EVENT.test(key)) names.add(key)
    }
    proto = Object.getPrototypeOf(proto)
  }
  return [...names].sort()
}

test('no component defines an on<Event> member', async () => {
  const classes = new Set<typeof Component>()
  const glob = new Glob('**/*.ts')
  for (const file of glob.scanSync({ cwd: import.meta.dir })) {
    // Build-time code runs under node, not in a page, and makes no components.
    if (file.endsWith('.test.ts') || file.startsWith('doc-system/site/'))
      continue
    const path = `${import.meta.dir}/${file}`
    if (!readFileSync(path, 'utf8').includes('elementCreator(')) continue
    const module = await import(path)
    for (const value of Object.values(module)) {
      if (typeof value === 'function' && value.prototype instanceof Component) {
        classes.add(value as typeof Component)
      }
    }
  }
  expect(classes.size).toBeGreaterThan(40)

  const found: Record<string, string[]> = {}
  for (const ComponentClass of classes) {
    const tag = (ComponentClass as any).tagName as string | undefined
    if (!tag) continue
    const members = onEventMembers(document.createElement(tag))
    if (members.length > 0) found[tag] = members
  }
  expect(found).toEqual({})
})
