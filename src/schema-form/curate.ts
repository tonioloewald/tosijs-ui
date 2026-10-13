/*
Curation: show a hand-picked set of a schema's properties, in a chosen order, under chosen
captions, optionally through a custom editor (#221).

DOM-free apart from `editorPlugin`, like the rest of the field model, so the picking rule is
testable without a form. A curation only chooses what is SHOWN. The form still holds and
validates the whole value, so a property that is not shown keeps its value and can still be
in error; `hiddenErrors` is what lets the form say so.
*/

import type { Node, FieldError, Field } from './fields.js'
import type { FieldPlugin } from './plugins.js'

/**
 * A custom editor for one property: a function returning an element that follows the
 * component contract (a `value` property, a `change` event), such as any tosijs-ui element
 * creator, or a `FieldPlugin` for full control.
 */
export type FieldEditor = FieldPlugin | (() => HTMLElement)

export interface CuratedField {
  /** The label to show. Defaults to the schema's `title`, else the humanised key. */
  caption?: string
  /** A line of help shown under the control. */
  help?: string
  /** Show the value without letting it be edited in this form. Not a security boundary. */
  readOnly?: boolean
  /**
   * Render the property with this editor in place of the built-in control. Its `value`
   * must be of the schema's type: a native `<input>` yields strings, so it suits string
   * properties only.
   */
  editor?: FieldEditor
  /**
   * Curate what is INSIDE an object, an array or a union. Paths are relative to the
   * property: for an array, to each of its items; for a union, to the branch the value
   * currently matches.
   */
  fields?: FieldCuration
  /** An object or array panel starts closed. */
  collapsed?: boolean
  /** For a union: `false` hides the variant picker, leaving the active branch's fields. */
  picker?: boolean
}

/**
 * A titled panel grouping some of the curated fields. Its key in the curation is an id
 * (the panel's `data-section`), not a path, and its `fields` use the same paths as the
 * entries around it.
 */
export interface CuratedSection {
  section: string
  fields: FieldCuration
  /** The panel starts closed. */
  collapsed?: boolean
}

/**
 * Paths into the schema (`thresholds.default`), in display order, each mapped to how to show
 * it. A string is shorthand for `{ caption }`, and `true` for "as the schema describes it".
 */
export type FieldCuration = {
  [path: string]: CuratedField | CuratedSection | string | true
}

export const CURATED_KEYS = [
  'caption',
  'help',
  'readOnly',
  'editor',
  'fields',
  'collapsed',
  'picker',
]
export const SECTION_KEYS = ['section', 'fields', 'collapsed']

export const isSection = (entry: unknown): entry is CuratedSection =>
  typeof entry === 'object' && entry !== null && 'section' in entry

export function curatedField(
  entry: CuratedField | string | true
): CuratedField {
  return entry === true
    ? {}
    : typeof entry === 'string'
    ? { caption: entry }
    : entry
}

/**
 * The node at a path. A path runs through object properties only: what is inside an array
 * or a union depends on the value, so those are reached through their entry's own `fields`.
 */
export function findNode(nodes: Node[], path: string): Node | undefined {
  for (const node of nodes) {
    if (node.path === path) return node
    if ('children' in node && path.startsWith(node.path + '.')) {
      return findNode(node.children, path)
    }
  }
  return undefined
}

export interface Curated {
  nodes: Node[]
  /** Paths the schema does not describe. Each renders as a placeholder that says so. */
  unknown: string[]
  /** Paths skipped because they are, contain, or are inside one already shown. */
  overlapping: string[]
  /** Entries carrying keys the curation does not have. */
  badKeys: Array<{ path: string; keys: string[] }>
  /** The entry for each path that is shown, by absolute path. */
  entries: Map<string, CuratedField>
}

/**
 * The curated nodes, in the curation's order. A path the schema does not describe becomes
 * an `unsupported` placeholder that says so and is listed in `unknown`: a field that
 * silently fails to appear looks the same as one that was never asked for.
 *
 * `base` is the path the curation's own paths are relative to (an array item, a union).
 * `elsewhere` answers "is this path described, only not here?", which is how a union's
 * curation can name fields of a branch the value does not currently match: those are left
 * out without a placeholder.
 */
export function curateNodes(
  nodes: Node[],
  fields: FieldCuration,
  base = '',
  elsewhere?: (path: string) => boolean
): Curated {
  const result: Curated = {
    nodes: [],
    unknown: [],
    overlapping: [],
    badKeys: [],
    entries: new Map(),
  }
  /*
  One control per path. A property and something inside it cannot both be shown, in the
  main area or across sections; the first one named wins.
  */
  const taken: string[] = []
  const within = (a: string, b: string) => a === b || a.startsWith(b + '.')
  const extraKeys = (entry: object, known: string[], path: string): void => {
    const keys = Object.keys(entry).filter((k) => !known.includes(k))
    if (keys.length > 0) result.badKeys.push({ path, keys })
  }
  const walk = (curation: FieldCuration, out: Node[]): void => {
    for (const [key, raw] of Object.entries(curation)) {
      if (isSection(raw)) {
        extraKeys(raw, SECTION_KEYS, key)
        const children: Node[] = []
        walk(raw.fields ?? {}, children)
        out.push({
          kind: 'group',
          path: '',
          label: raw.section,
          required: false,
          schema: {} as Field['schema'],
          children,
          section: key,
          ...(raw.collapsed ? { collapsed: true } : {}),
        })
        continue
      }
      const entry = curatedField(raw)
      const path = base ? `${base}.${key}` : key
      if (typeof raw === 'object') extraKeys(raw, CURATED_KEYS, path)
      if (taken.some((t) => within(path, t) || within(t, path))) {
        result.overlapping.push(path)
        continue
      }
      let node = findNode(nodes, path)
      if (!node) {
        if (elsewhere?.(path)) continue
        taken.push(path)
        result.unknown.push(path)
        const placeholder: Field = {
          path,
          label: entry.caption ?? key,
          kind: 'unsupported',
          schema: {} as Field['schema'],
          required: false,
          reason: `The schema describes no property at "${path}".`,
        }
        out.push(placeholder)
        // No editor: it would write a property the schema does not have.
        result.entries.set(path, { help: entry.help })
        continue
      }
      taken.push(path)
      if (entry.caption !== undefined) node = { ...node, label: entry.caption }
      if (entry.fields && 'children' in node) {
        const inner = curateNodes(
          node.children,
          entry.fields,
          node.path,
          elsewhere
        )
        node = { ...node, children: inner.nodes }
        result.unknown.push(...inner.unknown)
        result.overlapping.push(...inner.overlapping)
        result.badKeys.push(...inner.badKeys)
        for (const [p, e] of inner.entries) result.entries.set(p, e)
      }
      result.entries.set(path, entry)
      out.push(node)
    }
  }
  walk(fields, result.nodes)
  return result
}

/**
 * Errors the form has no field to show under: the value is invalid somewhere the curation
 * does not display. `shown` is every path with a rendered error slot.
 */
export function hiddenErrors(
  errors: FieldError[],
  shown: Iterable<string>
): FieldError[] {
  const visible = new Set(shown)
  return errors.filter((error) => !visible.has(error.path))
}

const isNativeControl = (el: HTMLElement): boolean =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLSelectElement ||
  el instanceof HTMLTextAreaElement

const editorPlugins = new WeakMap<() => HTMLElement, FieldPlugin>()

/** A `FieldEditor` as the plugin the form already knows how to host, one per editor. */
export function editorPlugin(editor: FieldEditor): FieldPlugin {
  if (typeof editor !== 'function') return editor
  let plugin = editorPlugins.get(editor)
  if (!plugin) {
    plugin = functionPlugin(editor)
    editorPlugins.set(editor, plugin)
  }
  return plugin
}

function functionPlugin(editor: () => HTMLElement): FieldPlugin {
  /*
  What the model last held for each editor, so an `input` followed by the `change` a blur
  sends writes once. BOTH directions update it: a value pushed in from outside is a new
  baseline, or the next edit back to the earlier value would be taken for a repeat and
  dropped.
  */
  const held = new WeakMap<HTMLElement, unknown>()
  const put = (el: HTMLElement, value: unknown): void => {
    const next = isNativeControl(el)
      ? value == null
        ? ''
        : String(value)
      : value
    held.set(el, next)
    if ((el as any).value !== next) (el as any).value = next
  }
  return {
    render({ value, set }) {
      const el = editor()
      put(el, value)
      const commit = (event: Event): void => {
        // The editor's own event stops here; the form fires its own `change`.
        event.stopPropagation()
        const next = (el as any).value
        if (Object.is(next, held.get(el))) return
        held.set(el, next)
        set(next)
      }
      el.addEventListener('input', commit)
      el.addEventListener('change', commit)
      return el
    },
    sync: put,
  }
}
