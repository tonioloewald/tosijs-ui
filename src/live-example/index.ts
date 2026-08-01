// Main exports
export {
  LiveExample,
  liveExample,
  enableTests,
  disableTests,
  testManager,
} from './component.js'

// Types
export type {
  ExampleContext,
  ExampleParts,
  RemotePayload,
  TransformFn,
} from './types.js'

// Test harness (for doc-browser integration)
export { runTests, createTestContext, expect } from './test-harness.js'
export type { TestResult, TestResults, TestContext } from './test-harness.js'

// Utilities (for advanced usage)
export { insertExamples } from './insert-examples.js'
export { loadTransform, rewriteImports, executeCode } from './code-transform.js'
export { executeInline, executeInIframe } from './execution.js'
export { RemoteSyncManager, STORAGE_KEY } from './remote-sync.js'
