import { ExampleContext, TransformFn } from './types'

export const AsyncFunction = (async () => {
  /* placeholder */
}).constructor

/**
 * Rewrite import statements to use context variables
 * e.g., `import { x } from 'tosijs'` -> `const { x } = tosijs`
 */
export function rewriteImports(code: string, contextKeys: string[]): string {
  let result = code
  for (const moduleName of contextKeys) {
    result = result.replace(
      new RegExp(`import \\{([^}]*)\\} from '${moduleName}'`, 'g'),
      (_, names: string) => {
        const collapsed = names.replace(/\s+/g, ' ').trim()
        return `const { ${collapsed} } = ${moduleName.replace(/-/g, '')}`
      }
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

  const contextKeys = Object.keys(context).map((key) => key.replace(/-/g, ''))
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
