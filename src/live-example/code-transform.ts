import { ExampleContext, TransformFn } from './types'

export const sucraseSrc = () =>
  'https://cdn.jsdelivr.net/npm/sucrase@3.35.0/+esm'

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
 * Used as fallback when sucrase can't be loaded.
 */
const passthroughTransform: TransformFn = (code, options) => {
  if (options.transforms.includes('typescript')) {
    throw new Error(
      'TypeScript code requires sucrase, which failed to load ' +
        '(possibly blocked by CSP or network). ' +
        'Use plain JavaScript or ensure sucrase is accessible.'
    )
  }
  return { code }
}

/**
 * Load sucrase transform function.
 *
 * webpackIgnore prevents bundlers (webpack/CRA) from rewriting
 * this dynamic import of an external CDN URL.
 * Falls back to a passthrough that errors on TypeScript.
 */
export async function loadTransform(): Promise<TransformFn> {
  try {
    const { transform } = await import(/* webpackIgnore: true */ sucraseSrc())
    return transform
  } catch (e) {
    console.warn('Failed to load sucrase:', e)
    return passthroughTransform
  }
}
