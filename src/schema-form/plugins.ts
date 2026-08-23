/*
The format-plugin seam: a schema `format` the form does not know, rendered by you.

Two things make this different from the component this design learned from, and both are
answers to the same defect (its SF-4). There, `render` was looked up per render but `styles`
were merged into the component's style spec **once, when the component was defined** — so a
plugin registered a moment too late rendered correctly and was completely unstyled, silently.
The fix was a bare `import './plugin'` placed above the component definition, load-bearing and
invisible; anyone registering a plugin from application code hit the trap again.

Here there is no ordering to get wrong:

- **styles are injected when the plugin registers**, into their own document stylesheet keyed
  by format, not folded into the component's;
- **live forms re-render** on registration, so a plugin registered after a form is on screen
  takes effect on that form.

Register whenever you like. There is no "too late".
*/

import { StyleSheet, elements, type XinStyleSheet } from 'tosijs'
import type { JSONSchema } from './json-schema.js'

/** What a plugin is handed. `set` writes the model — the plugin never owns the value. */
export interface FieldPluginContext {
  schema: JSONSchema
  /** dotted path into the form's value, e.g. `scores.0.threshold` */
  path: string
  label: string
  required: boolean
  value: unknown
  /** write this field's value; the form fires `change`, exactly as for a built-in control */
  set: (value: unknown) => void
  elements: typeof elements
}

export interface FieldPlugin {
  /**
   * Build the control. Called ONCE per field; the form wraps it in the usual labelled field
   * with the error slot, so a plugin renders the control and nothing else.
   */
  render: (context: FieldPluginContext) => HTMLElement
  /**
   * Put a value into an already-rendered control — the form's `value` can change without the
   * schema changing, and rebuilding the element instead would take focus off a slider the
   * user is dragging.
   *
   * Required, deliberately: a control that cannot accept a value back is not compatible with
   * a form whose model owns the data, and finding that out at authoring time beats finding it
   * out when a save silently reverts.
   */
  sync: (element: HTMLElement, value: unknown) => void
  /** injected under `tosi-schema-form-plugin-<format>` when the plugin registers */
  styles?: XinStyleSheet
}

const plugins = new Map<string, FieldPlugin>()
const listeners = new Set<(format: string) => void>()

/**
 * Claim a schema `format`.
 *
 * Registering the same format twice replaces the plugin — last one wins, which is what lets
 * an application override a library's default for its own pages.
 */
export function registerFieldPlugin(format: string, plugin: FieldPlugin): void {
  plugins.set(format, plugin)
  if (plugin.styles) {
    StyleSheet(`tosi-schema-form-plugin-${format}`, plugin.styles)
  }
  for (const listener of listeners) listener(format)
}

export function fieldPlugin(
  format: string | undefined
): FieldPlugin | undefined {
  return format === undefined ? undefined : plugins.get(format)
}

/** Called with the newly-claimed format, so live forms using it can pick it up. */
export function onFieldPluginsChanged(
  listener: (format: string) => void
): void {
  listeners.add(listener)
}

/** Does this schema use `format` anywhere? What decides whether a form cares about a plugin. */
export function schemaUsesFormat(
  schema: JSONSchema | undefined,
  format: string
): boolean {
  if (!schema || typeof schema !== 'object') return false
  if (schema.format === format) return true
  return Object.values(schema).some((value) =>
    Array.isArray(value)
      ? value.some((entry) => schemaUsesFormat(entry as JSONSchema, format))
      : value && typeof value === 'object'
      ? schemaUsesFormat(value as JSONSchema, format)
      : false
  )
}
