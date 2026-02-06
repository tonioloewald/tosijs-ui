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
      new RegExp(`import \\{(.*)\\} from '${moduleName}'`, 'g'),
      `const {$1} = ${moduleName.replace(/-/g, '')}`
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
 * Load sucrase transform function
 */
export async function loadTransform(): Promise<TransformFn> {
  const { transform } = await import(sucraseSrc())
  return transform
}
