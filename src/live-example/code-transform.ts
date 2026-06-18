import { ExampleContext, TransformFn } from './types'

export const AsyncFunction = (async () => {
  /* placeholder */
}).constructor

/**
 * Sanitize a context module key into a JS identifier used as the binding name
 * in rewritten imports and as the AsyncFunction parameter. Must be applied
 * consistently on both sides. e.g. 'tosijs-ui' -> 'tosijsui',
 * '@babylonjs/core' -> 'babylonjscore'.
 */
export function contextVarName(key: string): string {
  return key.replace(/[^a-zA-Z0-9_$]/g, '')
}

/**
 * Rewrite import statements (from the example context) to const bindings:
 *   import { x } from 'tosijs'        -> const { x } = tosijs
 *   import * as B from '@babylonjs'   -> const B = babylonjs   (context key)
 *   import Foo from 'my-lib'          -> const Foo = mylib
 * The `.elements` accessor form (`import { x } from 'tosijs'.elements`) is
 * preserved. Any static import that isn't from a context module (or uses an
 * unsupported form) throws a clear error rather than becoming a SyntaxError in
 * the AsyncFunction body.
 */
export function rewriteImports(code: string, contextKeys: string[]): string {
  let result = code
  for (const moduleName of contextKeys) {
    const js = contextVarName(moduleName)
    const m = moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // import { a, b } from 'mod'
    result = result.replace(
      new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*'${m}'`, 'g'),
      (_, names: string) => `const { ${names.replace(/\s+/g, ' ').trim()} } = ${js}`
    )
    // import * as X from 'mod'
    result = result.replace(
      new RegExp(`import\\s*\\*\\s*as\\s+(\\w+)\\s+from\\s*'${m}'`, 'g'),
      (_, name: string) => `const ${name} = ${js}`
    )
    // import X from 'mod'  (default)
    result = result.replace(
      new RegExp(`import\\s+(\\w+)\\s+from\\s*'${m}'`, 'g'),
      (_, name: string) => `const ${name} = ${js}`
    )
  }
  // Anything still a static import is unsupported — fail loudly with the line.
  const leftover = result.match(/^\s*import\s+['"{*\w][^\n]*/m)
  if (leftover) {
    throw new Error(
      `live example: unsupported import \`${leftover[0].trim()}\` — only imports ` +
        `from the example context (${contextKeys.join(', ')}) are supported, in ` +
        `{ named }, * as ns, or default form.`
    )
  }
  return result
}

/**
 * Execute code as an async function with injected context
 */
export async function executeCode(
  code: string,
  context: ExampleContext,
  transform: TransformFn
): Promise<void> {
  const rewrittenCode = rewriteImports(code, Object.keys(context))
  const transformedCode = transform(rewrittenCode, {
    transforms: ['typescript'],
  }).code

  const contextKeys = Object.keys(context).map(contextVarName)
  const contextValues = Object.values(context)

  // @ts-expect-error AsyncFunction constructor typing
  const func = new AsyncFunction(...contextKeys, transformedCode)
  await func(...contextValues)
}

/**
 * Passthrough transform — returns code unchanged.
 * Used as fallback when sucrase isn't installed.
 */
const passthroughTransform: TransformFn = (code, options) => {
  if (options.transforms.includes('typescript')) {
    throw new Error(
      'TypeScript examples require the "sucrase" package. ' +
        'Install it with: npm install sucrase'
    )
  }
  return { code }
}

const SUCRASE_CDN = 'https://cdn.jsdelivr.net/npm/sucrase@3.35.0/+esm'

/**
 * Load sucrase transform function.
 *
 * Tries three strategies in order:
 * 1. `import('sucrase')` — works for ESM consumers who installed the peer dep
 * 2. CDN import — works for IIFE consumers and when sucrase isn't installed
 * 3. Passthrough fallback — plain JS still works, TypeScript errors clearly
 */
export async function loadTransform(): Promise<TransformFn> {
  // Try installed package first
  try {
    const { transform } = await import('sucrase')
    return transform
  } catch {
    // Not installed — try CDN
  }

  try {
    const { transform } = await import(
      /* webpackIgnore: true */ SUCRASE_CDN
    )
    return transform
  } catch {
    console.warn(
      'sucrase not available — TypeScript examples will not work. ' +
        'Install with: npm install sucrase'
    )
    return passthroughTransform
  }
}
