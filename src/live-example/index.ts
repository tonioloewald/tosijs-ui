// Main exports
export { LiveExample, liveExample } from './component'

// Types
export type { ExampleContext, ExampleParts, RemotePayload, TransformFn } from './types'

// Test harness (for doc-browser integration)
export { runTests, createTestContext, expect } from './test-harness'
export type { TestResult, TestResults, TestContext } from './test-harness'

// Utilities (for advanced usage)
export { insertExamples } from './insert-examples'
export { loadTransform, rewriteImports, executeCode } from './code-transform'
export { executeInline, executeInIframe } from './execution'
export { RemoteSyncManager, STORAGE_KEY } from './remote-sync'
