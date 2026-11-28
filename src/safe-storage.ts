/*
`localStorage` that never throws.

With site data blocked (a Chrome setting, some private modes, a sandboxed iframe) the
`localStorage` ACCESSOR throws a SecurityError, so `typeof localStorage` is no guard. A read at
import time took the whole live-example module down with it, and so the doc site never hydrated
for that reader (#4351). What is stored this way is a preference or a draft, so a reader whose
browser refuses storage gets the default, and the page works.
*/

/** The stored value, or `null` when there is none or storage is unavailable. */
export function storageGet(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

/** Store a value; false when storage is unavailable or full. */
export function storageSet(key: string, value: string): boolean {
  try {
    globalThis.localStorage?.setItem(key, value)
    return true
  } catch {
    return false
  }
}
